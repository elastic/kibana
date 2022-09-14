/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { capitalize } from 'lodash';
import styled from 'styled-components';
import { ClientPluginsStart } from '../../../../../../plugin';
import { fetchSyntheticsMonitor } from '../../../../state/monitor_summary/api';
import { useStatusByLocation } from '../../../../hooks/use_status_by_location';
import { MonitorEnabled } from '../../management/monitor_list_table/monitor_enabled';
import { ActionsPopover } from './actions_popover';
import { selectOverviewState } from '../../../../state';
import { useMonitorDetail } from '../../../../hooks/use_monitor_detail';
import { MonitorOverviewItem } from '../types';
import { useMonitorDetailLocator } from '../../hooks/use_monitor_detail_locator';

// supplying `any` here because we're not doing anything prop-specific as it
// relates to the `EuiBasicTable` component, and typescript requires a generic arg here
const FlyoutHeadingTable = styled<any>(EuiBasicTable)`
  .euiTableRowCell {
    border-bottom: 1px solid transparent;
    border-top: 1px solid transparent;
  }
  .euiTable {
    width: inherit;
  }
  thead {
    .euiTableCellContent {
      padding-bottom: 0px;
    }
  }
  tbody {
    .euiTableCellContent {
      padding-top: 0px;
    }
  }
`;

const BoldItem = styled(EuiFlexItem)`
  font-weight: bold;
`;

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

export function MonitorDetailFlyout(props: Props) {
  const {
    id,
    currentDurationChartFrom,
    currentDurationChartTo,
    previousDurationChartFrom,
    previousDurationChartTo,
  } = props;
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

  const theme = useEuiTheme();
  const [location, setLocation] = useState<string>(props.location);
  const { observability } = useKibana<ClientPluginsStart>().services;
  const detailLink = useMonitorDetailLocator({
    monitorId: id,
  });
  const { ExploratoryViewEmbeddable } = observability;
  const {
    data: monitorSavedObject,
    error,
    status,
  } = useFetcher(() => fetchSyntheticsMonitor(id), [id]);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const monitorDetail = useMonitorDetail(id, location);
  const locationStatuses = useStatusByLocation(id);
  const locations = locationStatuses.locations?.filter((l: any) => !!l?.observer?.geo?.name) ?? [];
  return (
    <EuiFlyout onClose={props.onClose}>
      {status === FETCH_STATUS.FAILURE && <EuiErrorBoundary>{error?.message}</EuiErrorBoundary>}
      {status === FETCH_STATUS.LOADING && <EuiLoadingSpinner size="xl" />}
      {status === FETCH_STATUS.SUCCESS && monitorSavedObject && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiTitle>
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
            <FlyoutHeadingTable
              columns={[
                {
                  name: ENABLED_ITEM_TEXT,
                  field: '@timestamp',
                  outerWidth: '100px',
                  render: () => (
                    <MonitorEnabled
                      id={id}
                      monitor={monitorSavedObject.attributes}
                      reloadPage={props.onEnabledChange}
                    />
                  ),
                },
                {
                  name: LOCATION_COLUMN_NAME,
                  field: 'observer.geo.name',
                  render: () => (
                    <EuiSelect
                      compressed
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      options={
                        locations.map((l) => ({
                          value: l.observer?.geo?.name,
                          text: l.observer?.geo?.name,
                        })) ?? []
                      }
                    />
                  ),
                },
                {
                  name: STATUS_COLUMN_NAME,
                  field: 'monitor.status',
                  render: (statusString: string) => (
                    <EuiBadge color={statusString === 'up' ? 'success' : 'danger'}>
                      {statusString}
                    </EuiBadge>
                  ),
                },
              ]}
              items={monitorDetail.data ? [monitorDetail.data] : []}
              loading={monitorDetail.loading}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTitle size="s">
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
            <EuiSpacer />
            <EuiTitle size="s">
              <h3>{MONITOR_DETAILS_HEADER_TEXT}</h3>
            </EuiTitle>
            <EuiSpacer />
            <BodyInfo
              header={LAST_RUN_HEADER_TEXT}
              content={
                monitorDetail.data?.timestamp ? (
                  <Time timestamp={monitorDetail.data?.timestamp} />
                ) : (
                  ''
                )
              }
            />
            <BodyInfo
              header={LAST_MODIFIED_HEADER_TEXT}
              content={
                monitorSavedObject.updated_at ? (
                  <Time timestamp={monitorSavedObject.updated_at} />
                ) : (
                  ''
                )
              }
            />
            <BodyInfo header={MONITOR_ID_ITEM_TEXT} content={props.id} />
            <BodyInfo
              header={MONITOR_TYPE_HEADER_TEXT}
              content={capitalize(monitorSavedObject.type)}
            />
            <BodyInfo
              header={FREQUENCY_HEADER_TEXT}
              content={freqeuncyStr(monitorSavedObject?.attributes.schedule)}
            />
            <BodyInfo
              header={TAGS_HEADER_TEXT}
              content={
                <>
                  {monitorSavedObject?.attributes.tags?.map((tag) => (
                    <EuiFlexItem key={`${tag}-tag`} grow={false}>
                      <EuiBadge color="hollow">{tag}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </>
              }
            />
            <BodyInfo
              header={URL_HEADER_TEXT}
              content={
                monitorDetail.data?.url?.full ? (
                  <EuiLink href={monitorDetail.data.url.full}>
                    {monitorDetail.data.url.full}
                  </EuiLink>
                ) : (
                  ''
                )
              }
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty>{CLOSE_FLYOUT_TEXT}</EuiButtonEmpty>
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

function BodyInfo({ header, content }: { header: string; content: JSX.Element | string }) {
  return (
    <EuiFlexGroup>
      <BoldItem>{header}</BoldItem>
      <EuiFlexItem>{content}</EuiFlexItem>
    </EuiFlexGroup>
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

const STATUS_COLUMN_NAME = i18n.translate('xpack.synthetics.monitorList.statusColumnName', {
  defaultMessage: 'Status',
});

const LOCATION_COLUMN_NAME = i18n.translate('xpack.synthetics.monitorList.locationColumnName', {
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
