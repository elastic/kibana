/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
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
import { FETCH_STATUS, useEsSearch, useFetcher } from '@kbn/observability-plugin/public';
import moment from 'moment';
import React, { useState } from 'react';
import { capitalize } from 'lodash';
import styled from 'styled-components';
import { ClientPluginsStart } from '../../../../../../plugin';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../../common/constants/ui';
import { fetchSyntheticsMonitor } from '../../../../state/monitor_summary/api';
import { useStatusByLocation } from '../../../../hooks/use_status_by_location';
import { MonitorEnabled } from '../../management/monitor_list_table/monitor_enabled';
import { Ping } from '../../../../../../../common/runtime_types';

export function MonitorDetailFlyout(props: {
  id: string;
  location: string;
  onClose: () => void;
  onEnabledChange: () => void;
}) {
  const { id } = props;
  const theme = useEuiTheme();
  const [location, setLocation] = useState<string>(props.location);
  const { observability } = useKibana<ClientPluginsStart>().services;
  const { ExploratoryViewEmbeddable } = observability;
  const {
    data: monitorSavedObject,
    error,
    status,
  } = useFetcher(() => fetchSyntheticsMonitor(id), [id]);

  const monitorDetail = useMonitorDetail(id, location);
  const locationStatuses = useStatusByLocation(id);
  const locations = locationStatuses.locations?.filter((l: any) => !!l?.observer?.geo?.name) ?? [];
  return (
    <EuiFlyout onClose={props.onClose}>
      {status === FETCH_STATUS.FAILURE && <EuiErrorBoundary>{error}</EuiErrorBoundary>}
      {status === FETCH_STATUS.LOADING && <EuiLoadingSpinner size="xl" />}
      {status === FETCH_STATUS.SUCCESS && monitorSavedObject && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>{monitorSavedObject?.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonIcon
                  iconType="boxesHorizontal"
                  onClick={() => {
                    throw Error('not implemented');
                  }}
                />
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
                      monitor={monitorSavedObject}
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
                      {status}
                    </EuiBadge>
                  ),
                },
              ]}
              items={monitorDetail.data ? [monitorDetail.data] : []}
              loading={monitorDetail.loading}
              pagination={undefined}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTitle size="s">
              <h3>{DURATION_HEADER_TEXT}</h3>
            </EuiTitle>
            <ExploratoryViewEmbeddable
              customHeight={'200px'}
              reportType="kpi-over-time"
              axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
              legendIsVisible={true}
              legendPosition="bottom"
              attributes={[
                {
                  seriesType: 'area',
                  color: theme.euiTheme.colors.success,
                  time: {
                    from: 'now-12h',
                    to: 'now',
                  },
                  reportDefinitions: {
                    'monitor.id': [id],
                    'observer.geo.name': [location],
                  },
                  dataType: 'synthetics',
                  selectedMetricField: 'monitor.duration.us',
                  name: 'All monitors response duration',
                },
                {
                  seriesType: 'line',
                  color: '#ddaf84',
                  time: {
                    from: 'now-24h',
                    to: 'now-12h',
                  },
                  reportDefinitions: {
                    'monitor.id': [id],
                    'observer.geo.name': [location],
                  },
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
              content={freqeuncyStr(monitorSavedObject?.schedule)}
            />
            <BodyInfo
              header={TAGS_HEADER_TEXT}
              content={
                <>
                  {monitorSavedObject.tags?.map((tag) => (
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
                <EuiLink href={monitorDetail.data?.url?.full ?? ''}>
                  {monitorDetail.data?.url?.full ?? ''}
                </EuiLink>
              }
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty>{CLOSE_FLYOUT_TEXT}</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/* TODO: Link to monitor */}
                <EuiButton fill href="" iconType="sortRight" iconSide="right">
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

const useMonitorDetail = (
  monitorId: string,
  location: string
): { data?: Ping; loading?: boolean } => {
  const params = {
    index: SYNTHETICS_INDEX_PATTERN,
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                'monitor.id': monitorId,
              },
            },
            {
              term: {
                'observer.geo.name': location,
              },
            },
            {
              exists: {
                field: 'summary',
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
    },
  };
  const { data: result, loading } = useEsSearch<Ping & { '@timestamp': string }, SearchRequest>(
    params,
    [monitorId],
    {
      name: 'getMonitorStatusByLocation',
    }
  );

  if (!result || result.hits.hits.length !== 1) return { data: undefined, loading };
  return {
    data: { ...result.hits.hits[0]._source, timestamp: result.hits.hits[0]._source['@timestamp'] },
    loading,
  };
};

function unitToString(unit: string) {
  switch (unit) {
    case 's':
      return SECONDS_STRING;
    case 'm':
      return MINUTES_STRING;
    case 'h':
      return HOURS_STRING;
    case 'd':
      return DAYS_STRING;
    default:
      return unit;
  }
}

function freqeuncyStr(frequency: { number: string; unit: string }) {
  return `Every ${frequency.number} ${unitToString(frequency.unit)}`;
}

function BodyInfo({ header, content }: { header: string; content: JSX.Element | string }) {
  return (
    <EuiFlexGroup>
      <BoldItem>{header}</BoldItem>
      <EuiFlexItem>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
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

const SECONDS_STRING = i18n.translate('xpack.observability.synthetics.monitorDetail.seconds', {
  defaultMessage: 'seconds',
});

const MINUTES_STRING = i18n.translate('xpack.observability.synthetics.monitorDetail.minutes', {
  defaultMessage: 'minutes',
});

const HOURS_STRING = i18n.translate('xpack.observability.synthetics.monitorDetail.hours', {
  defaultMessage: 'hours',
});

const DAYS_STRING = i18n.translate('xpack.observability.synthetics.monitorDetail.days', {
  defaultMessage: 'days',
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
