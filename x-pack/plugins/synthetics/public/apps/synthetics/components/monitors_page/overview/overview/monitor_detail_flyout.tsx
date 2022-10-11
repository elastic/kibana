/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { SavedObject } from '@kbn/core/public';
import { FetcherResult } from '@kbn/observability-plugin/public/hooks/use_fetcher';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { capitalize } from 'lodash';
import { ClientPluginsStart } from '../../../../../../plugin';
import { useStatusByLocation } from '../../../../hooks/use_status_by_location';
import { MonitorEnabled } from '../../management/monitor_list_table/monitor_enabled';
import { ActionsPopover } from './actions_popover';
import { selectOverviewState } from '../../../../state';
import { useMonitorDetail } from '../../../../hooks/use_monitor_detail';
import { EncryptedSyntheticsMonitor, MonitorOverviewItem, SyntheticsMonitor } from '../types';
import { useMonitorDetailLocator } from '../../hooks/use_monitor_detail_locator';
import { fetchSyntheticsMonitor } from '../../../../state/overview/api';

interface Props {
  id: string;
  location: string;
  onClose: () => void;
  onEnabledChange: () => void;
  currentDurationChartFrom?: string;
  currentDurationChartTo?: string;
  previousDurationChartFrom?: string;
  previousDurationChartTo?: string;
}

const DEFAULT_DURATION_CHART_FROM = 'now-12h';
const DEFAULT_CURRENT_DURATION_CHART_TO = 'now';
const DEFAULT_PREVIOUS_DURATION_CHART_FROM = 'now-24h';
const DEFAULT_PREVIOUS_DURATION_CHART_TO = 'now-12h';

function DetailFlyoutDurationChart({
  id,
  location,
  currentDurationChartFrom,
  currentDurationChartTo,
  previousDurationChartFrom,
  previousDurationChartTo,
}: Pick<
  Props,
  | 'id'
  | 'location'
  | 'currentDurationChartFrom'
  | 'currentDurationChartTo'
  | 'previousDurationChartFrom'
  | 'previousDurationChartTo'
>) {
  const theme = useEuiTheme();
  const { observability } = useKibana<ClientPluginsStart>().services;
  const { ExploratoryViewEmbeddable } = observability;
  return (
    <ExploratoryViewEmbeddable
      customHeight="200px"
      reportType="kpi-over-time"
      axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
      legendIsVisible={true}
      legendPosition="bottom"
      attributes={[
        {
          seriesType: 'area',
          color: theme.euiTheme.colors.success,
          time: {
            from: currentDurationChartFrom ?? DEFAULT_DURATION_CHART_FROM,
            to: currentDurationChartTo ?? DEFAULT_CURRENT_DURATION_CHART_TO,
          },
          reportDefinitions: {
            'monitor.id': [id],
            'observer.geo.name': [location],
          },
          filters: [
            {
              field: 'observer.geo.name',
              values: [location],
            },
          ],
          dataType: 'synthetics',
          selectedMetricField: 'monitor.duration.us',
          name: 'All monitors response duration',
        },
        {
          seriesType: 'line',
          color: '#ddaf84',
          time: {
            from: previousDurationChartFrom ?? DEFAULT_PREVIOUS_DURATION_CHART_FROM,
            to: previousDurationChartTo ?? DEFAULT_PREVIOUS_DURATION_CHART_TO,
          },
          reportDefinitions: {
            'monitor.id': [id],
            'observer.geo.name': [location],
          },
          filters: [
            {
              field: 'observer.geo.name',
              values: [location],
            },
          ],
          dataType: 'synthetics',
          selectedMetricField: 'monitor.duration.us',
          name: 'Previous period',
        },
      ]}
    />
  );
}

function LocationSelect({
  locationData,
  currentLocation,
  id,
  setCurrentLocation,
  monitor,
  onEnabledChange,
}: {
  locationData: Pick<ReturnType<typeof useStatusByLocation>, 'locations'>;
  currentLocation: string;
  id: string;
  monitor: EncryptedSyntheticsMonitor;
  onEnabledChange: () => void;
  setCurrentLocation: React.Dispatch<string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { locations } = locationData;
  const isDown = !!locations.find((l) => l.observer?.geo?.name === currentLocation)?.summary?.down;
  console.log('current location', currentLocation);
  return (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem grow={2}>
        <EuiDescriptionList compressed>
          <EuiDescriptionListTitle>{ENABLED_ITEM_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <MonitorEnabled id={id} monitor={monitor} reloadPage={onEnabledChange} />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <EuiDescriptionList compressed>
          <EuiDescriptionListTitle>{LOCATION_TITLE_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {currentLocation}
            <EuiPopover
              button={
                <EuiButtonIcon
                  aria-label={LOCATION_SELECT_POPOVER_ICON_BUTTON_LABEL}
                  onClick={() => setIsOpen(!isOpen)}
                  color="primary"
                  iconType="arrowDown"
                />
              }
              isOpen={isOpen}
              closePopover={() => setIsOpen(false)}
              panelPaddingSize="none"
            >
              <EuiContextMenu
                initialPanelId={0}
                size="s"
                panels={[
                  {
                    id: 0,
                    title: GO_TO_LOCATIONS_LABEL,
                    items: locations.map((l) => {
                      console.log(l);
                      return {
                        name: l.observer?.geo?.name,
                        icon: <EuiHealth color={!!l.summary?.down ? 'danger' : 'success'} />,
                        disabled: !l.observer?.geo?.name || l.observer.geo.name === currentLocation,
                        onClick: () => {
                          if (l.observer?.geo?.name && currentLocation !== l.observer.geo.name)
                            setCurrentLocation(l.observer?.geo?.name);
                        },
                      };
                    }),
                  },
                ]}
              />
            </EuiPopover>
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <EuiDescriptionList compressed>
          <EuiDescriptionListTitle>{STATUS_TITLE_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiBadge color={isDown ? 'danger' : 'success'}>
              {isDown ? MONITOR_STATUS_DOWN_LABEL : MONITOR_STATUS_UP_LABEL}
            </EuiBadge>
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function MonitorDetailFlyout(props: Props) {
  const { id } = props;
  const state = useSelector(selectOverviewState);

  const monitor: MonitorOverviewItem | null = useMemo(() => {
    const { pages } = state.data;
    const pageKeys = Object.keys(pages);
    for (const key of pageKeys) {
      const overviewItem = pages[key].filter(({ id: itemId }) => itemId === id)[0];
      if (overviewItem) return overviewItem;
    }
    return null;
  }, [id, state.data]);

  const [location, setLocation] = useState<string>(props.location);
  const detailLink = useMonitorDetailLocator({
    monitorId: id,
  });
  const {
    data: monitorSavedObject,
    error,
    status,
  }: FetcherResult<SavedObject<SyntheticsMonitor>> = useFetcher(
    () => fetchSyntheticsMonitor(id),
    [id]
  );
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const monitorDetail = useMonitorDetail(id, location);
  const locationStatuses = useStatusByLocation(id);
  const locations = locationStatuses.locations?.filter((l: any) => !!l?.observer?.geo?.name) ?? [];
  console.log(monitorSavedObject);
  console.log('locations', locations);
  return (
    <EuiFlyout size="s" type="push" onClose={props.onClose}>
      {status === FETCH_STATUS.FAILURE && <EuiErrorBoundary>{error?.message}</EuiErrorBoundary>}
      {status === FETCH_STATUS.LOADING && <EuiLoadingSpinner size="xl" />}
      {status === FETCH_STATUS.SUCCESS && monitorSavedObject && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{monitorSavedObject?.attributes.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {monitor && (
                  <ActionsPopover
                    isPopoverOpen={isActionsPopoverOpen}
                    isInspectView
                    monitor={monitor}
                    setIsPopoverOpen={setIsActionsPopoverOpen}
                    position="default"
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />

            <LocationSelect
              currentLocation={location}
              locationData={{ locations }}
              setCurrentLocation={setLocation}
              id={id}
              monitor={monitorSavedObject.attributes}
              onEnabledChange={props.onEnabledChange}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTitle size="xs">
              <h3>{DURATION_HEADER_TEXT}</h3>
            </EuiTitle>
            <DetailFlyoutDurationChart {...props} location={location} />
            <EuiSpacer />
            <EuiTitle size="xs">
              <h3>{MONITOR_DETAILS_HEADER_TEXT}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiDescriptionList
              type="column"
              compressed
              listItems={[
                {
                  title: LAST_RUN_HEADER_TEXT,
                  description: monitorDetail.data?.timestamp ? (
                    <Time timestamp={monitorDetail.data?.timestamp} />
                  ) : (
                    ''
                  ),
                },
                {
                  title: LAST_MODIFIED_HEADER_TEXT,
                  description: monitorSavedObject.updated_at ? (
                    <Time timestamp={monitorSavedObject.updated_at} />
                  ) : (
                    ''
                  ),
                },
                {
                  title: MONITOR_ID_ITEM_TEXT,
                  description: props.id,
                },
                {
                  title: MONITOR_TYPE_HEADER_TEXT,
                  description: capitalize(monitorSavedObject.type),
                },
                {
                  title: FREQUENCY_HEADER_TEXT,
                  description: freqeuncyStr(monitorSavedObject?.attributes.schedule),
                },
                {
                  title: TAGS_HEADER_TEXT,
                  description: (
                    <>
                      {monitorSavedObject?.attributes.tags?.map((tag) => (
                        <EuiFlexItem key={`${tag}-tag`} grow={false}>
                          <EuiBadge color="hollow">{tag}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </>
                  ),
                },
                {
                  title: URL_HEADER_TEXT,
                  description: monitorDetail.data?.url?.full ? (
                    <EuiLink external href={monitorDetail.data.url.full}>
                      {monitorDetail.data.url.full}
                    </EuiLink>
                  ) : (
                    ''
                  ),
                },
              ]}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={props.onClose}>{CLOSE_FLYOUT_TEXT}</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  // `detailLink` can be undefined
                  isDisabled={!detailLink}
                  fill
                  href={detailLink}
                  iconType="sortRight"
                  iconSide="right"
                >
                  {GO_TO_MONITOR_LINK_TEXT}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyout>
  );
}

function freqeuncyStr(frequency: { number: string; unit: string }) {
  return `Every ${frequency.number} ${unitToString(
    frequency.unit,
    parseInt(frequency.number, 10)
  )}`;
}

function dateFmtString(timestamp: string) {
  let dateString: string;
  if (new Date(timestamp).toDateString() === new Date().toDateString()) {
    dateString = `[${i18n.translate('xpack.synthetics.monitorList.dateString.today', {
      defaultMessage: 'Today',
    })}]`;
  } else dateString = 'MMMM DD YYYY';
  return dateString + ' @ HH:mm:ss';
}

const Time = ({ timestamp }: { timestamp: string }) => (
  <time dateTime={timestamp}>{moment(timestamp).format(dateFmtString(timestamp))}</time>
);

function unitToString(unit: string, n: number) {
  switch (unit) {
    case 's':
      return secondsString(n);
    case 'm':
      return minutesString(n);
    case 'h':
      return hoursString(n);
    case 'd':
      return daysString(n);
    default:
      return unit;
  }
}

const secondsString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.seconds', {
    defaultMessage: '{n, plural, one {second} other {seconds}}',
    values: { n },
  });

const minutesString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.minutes', {
    defaultMessage: '{n, plural, one {minute} other {minutes}}',
    values: { n },
  });

const hoursString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.hours', {
    defaultMessage: '{n, plural, one {hour} other {hours}}',
    values: { n },
  });

const daysString = (n: number) =>
  i18n.translate('xpack.synthetics.monitorDetail.days', {
    defaultMessage: '{n, plural, one {day} other {days}}',
    values: { n },
  });

const URL_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.urlHeaderText', {
  defaultMessage: 'URL',
});

const TAGS_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.tagsHeaderText', {
  defaultMessage: 'Tags',
});

const FREQUENCY_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.frequencyHeaderText', {
  defaultMessage: 'Frequency',
});

const MONITOR_TYPE_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.monitorType', {
  defaultMessage: 'Monitor type',
});

const LAST_MODIFIED_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.lastModified', {
  defaultMessage: 'Last modified',
});

const LAST_RUN_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.lastRunHeaderText', {
  defaultMessage: 'Last run',
});

const STATUS_TITLE_TEXT = i18n.translate('xpack.synthetics.monitorList.statusColumnName', {
  defaultMessage: 'Status',
});

const LOCATION_TITLE_TEXT = i18n.translate('xpack.synthetics.monitorList.locationColumnName', {
  defaultMessage: 'Location',
});

const DURATION_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.durationHeaderText', {
  defaultMessage: 'Duration',
});

const MONITOR_DETAILS_HEADER_TEXT = i18n.translate(
  'xpack.synthetics.monitorList.monitorDetailsHeaderText',
  {
    defaultMessage: 'Monitor Details',
  }
);

const ENABLED_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.enabledItemText', {
  defaultMessage: 'Enabled',
});

const MONITOR_ID_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.monitorIdItemText', {
  defaultMessage: 'Monitor ID',
});

const CLOSE_FLYOUT_TEXT = i18n.translate('xpack.synthetics.monitorList.closeFlyoutText', {
  defaultMessage: 'Cancel',
});

const GO_TO_MONITOR_LINK_TEXT = i18n.translate('xpack.synthetics.monitorList.goToMonitorLinkText', {
  defaultMessage: 'Go to monitor',
});

const GO_TO_LOCATIONS_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.flyoutHeader.goToLocations',
  {
    defaultMessage: 'Go to location',
  }
);

const LOCATION_SELECT_POPOVER_ICON_BUTTON_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.flyout.locationSelect.iconButton.label',
  {
    defaultMessage:
      "This icon button opens a context menu that will allow you to change the monitor's selected location. If you change the location, the flyout will display metrics for the monitor's performance in that location.",
  }
);

const MONITOR_STATUS_UP_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.flyout.monitorStatus.up',
  {
    defaultMessage: 'Up',
    description: '"Up" in the sense that a process is running and available.',
  }
);

const MONITOR_STATUS_DOWN_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.flyout.monitorStatus.down',
  {
    defaultMessage: 'Down',
    description: '"Down" in the sense that a process is not running or available.',
  }
);
