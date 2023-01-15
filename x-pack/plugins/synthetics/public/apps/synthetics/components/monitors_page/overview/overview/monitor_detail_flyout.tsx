/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenu,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListProps,
  EuiDescriptionListTitle,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { SavedObject } from '@kbn/core/public';
import { FetcherResult } from '@kbn/observability-plugin/public/hooks/use_fetcher';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { capitalize } from 'lodash';
import { useTheme } from '@kbn/observability-plugin/public';
import { useKibanaDateFormat } from '../../../../../../hooks/use_kibana_date_format';
import { ClientPluginsStart } from '../../../../../../plugin';
import { useStatusByLocation } from '../../../../hooks/use_status_by_location';
import { MonitorEnabled } from '../../management/monitor_list_table/monitor_enabled';
import { ActionsPopover } from './actions_popover';
import { selectOverviewState, selectServiceLocationsState } from '../../../../state';
import { useMonitorDetail } from '../../../../hooks/use_monitor_detail';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorOverviewItem,
  SyntheticsMonitor,
} from '../types';
import { useMonitorDetailLocator } from '../../hooks/use_monitor_detail_locator';
import { fetchSyntheticsMonitor } from '../../../../state/overview/api';
import { MonitorStatus } from '../../../common/components/monitor_status';

interface Props {
  configId: string;
  id: string;
  location: string;
  locationId: string;
  onClose: () => void;
  onEnabledChange: () => void;
  onLocationChange: (params: {
    configId: string;
    id: string;
    location: string;
    locationId: string;
  }) => void;
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
  const theme = useTheme();

  const { observability } = useKibana<ClientPluginsStart>().services;
  const { ExploratoryViewEmbeddable } = observability;
  return (
    <EuiPageSection bottomBorder="extended">
      <EuiTitle size="xs">
        <h3>{DURATION_HEADER_TEXT}</h3>
      </EuiTitle>
      <ExploratoryViewEmbeddable
        customHeight="200px"
        reportType="kpi-over-time"
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={true}
        legendPosition="bottom"
        attributes={[
          {
            seriesType: 'area',
            color: theme?.eui?.euiColorVis1,
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
            name: DURATION_SERIES_NAME,
            operationType: 'average',
          },
          {
            seriesType: 'line',
            color: theme?.eui?.euiColorVis7,
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
            name: PREVIOUS_PERIOD_SERIES_NAME,
            operationType: 'average',
          },
        ]}
      />
    </EuiPageSection>
  );
}

function LocationSelect({
  locations,
  currentLocation,
  configId,
  setCurrentLocation,
  monitor,
  onEnabledChange,
}: {
  locations: ReturnType<typeof useStatusByLocation>['locations'];
  currentLocation: string;
  configId: string;
  monitor: EncryptedSyntheticsMonitor;
  onEnabledChange: () => void;
  setCurrentLocation: (location: string, locationId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const status = locations.find((l) => l.observer?.geo?.name === currentLocation)?.monitor?.status;

  const { locations: allLocations } = useSelector(selectServiceLocationsState);

  return (
    <EuiFlexGroup wrap={true} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList compressed>
          <EuiDescriptionListTitle>{LOCATION_TITLE_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiPopover
              button={
                <>
                  <EuiLink
                    aria-label={LOCATION_SELECT_POPOVER_LINK_LABEL}
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>{currentLocation}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="arrowDown" size="s" color="inherit" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiLink>
                </>
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
                      const loc = allLocations.find((ll) => ll.label === l.observer?.geo?.name);
                      return {
                        name: l.observer?.geo?.name,
                        icon: <EuiHealth color={!!l.summary?.down ? 'danger' : 'success'} />,
                        disabled: !l.observer?.geo?.name || l.observer.geo.name === currentLocation,
                        onClick: () => {
                          if (l.observer?.geo?.name && currentLocation !== l.observer.geo.name)
                            setCurrentLocation(l.observer?.geo?.name, loc?.id!);
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
      <EuiFlexItem grow={false}>
        <MonitorStatus status={status} monitor={monitor} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList align="left" compressed>
          <EuiDescriptionListTitle>{ENABLED_ITEM_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <MonitorEnabled configId={configId} monitor={monitor} reloadPage={onEnabledChange} />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function LoadingState() {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function MonitorDetailFlyout(props: Props) {
  const { id, configId, onLocationChange, locationId } = props;
  const {
    data: { monitors },
  } = useSelector(selectOverviewState);

  const monitor: MonitorOverviewItem | undefined = useMemo(() => {
    const overviewItem = monitors.filter(({ id: overviewItemId }) => overviewItemId === id)[0];
    if (overviewItem) return overviewItem;
  }, [id, monitors]);

  const setLocation = useCallback(
    (location: string, locationIdT: string) =>
      onLocationChange({ id, configId, location, locationId: locationIdT }),
    [id, configId, onLocationChange]
  );

  const detailLink = useMonitorDetailLocator({
    configId: id,
    locationId,
  });

  const {
    data: monitorSavedObject,
    error,
    status,
  }: FetcherResult<SavedObject<SyntheticsMonitor>> = useFetcher(
    () => fetchSyntheticsMonitor(configId),
    [configId]
  );

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const monitorDetail = useMonitorDetail(configId, props.location);
  const locationStatuses = useStatusByLocation(configId);
  const locations = locationStatuses.locations?.filter((l: any) => !!l?.observer?.geo?.name) ?? [];

  const isOverlay = useIsWithinMaxBreakpoint('xl');

  return (
    <EuiFlyout
      size="600px"
      type={isOverlay ? 'overlay' : 'push'}
      onClose={props.onClose}
      paddingSize="none"
    >
      {status === FETCH_STATUS.FAILURE && <EuiErrorBoundary>{error?.message}</EuiErrorBoundary>}
      {status === FETCH_STATUS.LOADING && <LoadingState />}
      {status === FETCH_STATUS.SUCCESS && monitorSavedObject && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
              <EuiFlexGroup responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>{monitorSavedObject?.attributes[ConfigKey.NAME]}</h2>
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
                      iconHasPanel={false}
                      iconSize="xs"
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <LocationSelect
                currentLocation={props.location}
                locations={locations}
                setCurrentLocation={setLocation}
                configId={configId}
                monitor={monitorSavedObject.attributes}
                onEnabledChange={props.onEnabledChange}
              />
            </EuiPanel>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <DetailFlyoutDurationChart {...props} location={props.location} />
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
              <EuiTitle size="xs">
                <h3>{MONITOR_DETAILS_HEADER_TEXT}</h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiDescriptionList
                align="left"
                type="column"
                compressed
                listItems={
                  [
                    monitorDetail.data?.url?.full
                      ? {
                          title: URL_HEADER_TEXT,
                          description: (
                            <EuiLink external href={monitorDetail.data.url.full}>
                              {monitorDetail.data.url.full}
                            </EuiLink>
                          ),
                        }
                      : undefined,
                    {
                      title: LAST_RUN_HEADER_TEXT,
                      description: monitorDetail.data?.timestamp ? (
                        <Time timestamp={monitorDetail.data.timestamp} />
                      ) : (
                        <EuiText color="subdued">--</EuiText>
                      ),
                    },
                    {
                      title: LAST_MODIFIED_HEADER_TEXT,
                      description: <Time timestamp={monitorSavedObject.updated_at} />,
                    },
                    monitorSavedObject?.attributes[ConfigKey.PROJECT_ID]
                      ? {
                          title: PROJECT_ID_HEADER_TEXT,
                          description: monitorSavedObject?.attributes[ConfigKey.PROJECT_ID] || '',
                        }
                      : undefined,
                    {
                      title: MONITOR_ID_ITEM_TEXT,
                      description: props.id,
                    },
                    {
                      title: MONITOR_TYPE_HEADER_TEXT,
                      description: capitalize(
                        monitorSavedObject?.attributes[ConfigKey.FORM_MONITOR_TYPE]
                      ),
                    },
                    {
                      title: FREQUENCY_HEADER_TEXT,
                      description: frequencyStr(monitorSavedObject?.attributes[ConfigKey.SCHEDULE]),
                    },
                    monitorSavedObject?.attributes[ConfigKey.TAGS] &&
                    monitorSavedObject?.attributes[ConfigKey.TAGS].length
                      ? {
                          title: TAGS_HEADER_TEXT,
                          description: (
                            <EuiBadgeGroup>
                              {monitorSavedObject?.attributes[ConfigKey.TAGS]?.map((tag) => (
                                <EuiBadge key={`${tag}-tag`} color="hollow">
                                  {tag}
                                </EuiBadge>
                              ))}
                            </EuiBadgeGroup>
                          ),
                        }
                      : undefined,
                  ].filter(
                    (descriptionListItem) => !!descriptionListItem
                  ) as EuiDescriptionListProps['listItems']
                }
              />
            </EuiPanel>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="transparent">
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={props.onClose}>{CLOSE_FLYOUT_TEXT}</EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    // `detailLink` can be undefined, in this case, disable the button
                    isDisabled={!detailLink}
                    href={detailLink}
                    iconType="sortRight"
                    iconSide="right"
                    fill
                  >
                    {GO_TO_MONITOR_LINK_TEXT}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyout>
  );
}

export function frequencyStr(frequency: { number: string; unit: string }) {
  return translateUnitMessage(
    `${frequency.number} ${unitToString(frequency.unit, parseInt(frequency.number, 10))}`
  );
}

const Time = ({ timestamp }: { timestamp?: string }) => {
  const formatStr = useKibanaDateFormat();

  return timestamp ? <time dateTime={timestamp}>{moment(timestamp).format(formatStr)}</time> : null;
};

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

const LOCATION_TITLE_TEXT = i18n.translate('xpack.synthetics.monitorList.locationColumnName', {
  defaultMessage: 'Location',
});

const DURATION_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.durationHeaderText', {
  defaultMessage: 'Duration',
});

const DURATION_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.durationSeriesName',
  {
    defaultMessage: 'Duration',
  }
);

const PREVIOUS_PERIOD_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.previousPeriodSeriesName',
  {
    defaultMessage: 'Previous period',
  }
);

const MONITOR_DETAILS_HEADER_TEXT = i18n.translate(
  'xpack.synthetics.monitorList.monitorDetailsHeaderText',
  {
    defaultMessage: 'Monitor Details',
  }
);

const ENABLED_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.enabledItemText', {
  defaultMessage: 'Enabled',
});

const PROJECT_ID_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.projectIdHeaderText', {
  defaultMessage: 'Project ID',
});

const MONITOR_ID_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.monitorIdItemText', {
  defaultMessage: 'Monitor ID',
});

const CLOSE_FLYOUT_TEXT = i18n.translate('xpack.synthetics.monitorList.closeFlyoutText', {
  defaultMessage: 'Close',
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

const LOCATION_SELECT_POPOVER_LINK_LABEL = i18n.translate(
  'xpack.synthetics.monitorList.flyout.locationSelect.iconButton.label',
  {
    defaultMessage:
      "This button opens a context menu that will allow you to change the monitor's selected location. If you change the location, the flyout will display metrics for the monitor's performance in that location.",
  }
);

function translateUnitMessage(unitMsg: string) {
  return i18n.translate('xpack.synthetics.monitorList.flyout.unitStr', {
    defaultMessage: 'Every {unitMsg}',
    values: { unitMsg },
    description: 'This displays a message like "Every 10 minutes" or "Every 30 seconds"',
  });
}
