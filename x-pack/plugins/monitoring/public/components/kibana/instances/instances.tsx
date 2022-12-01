/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { capitalize, get } from 'lodash';
import React, { Fragment } from 'react';
import type { TableChange, Sorting, Pagination } from '../../../application/hooks/use_table';
import type { AlertsByName } from '../../../alerts/types';
import { KIBANA_SYSTEM_ID } from '../../../../common/constants';
import { SetupModeFeature } from '../../../../common/enums';
import { ElasticsearchSourceKibanaStats } from '../../../../common/types/es';
import { AlertsStatus } from '../../../alerts/status';
import { ExternalConfigContext } from '../../../application/contexts/external_config_context';
import { formatMetric, formatNumber } from '../../../lib/format_number';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeBadge } from '../../setup_mode/badge';
import { ListingCallOut } from '../../setup_mode/listing_callout';
import { STATUS_ICON_TYPES } from '../../status_icon';
import { EuiMonitoringTable } from '../../table';
import { ClusterStatus } from '../cluster_status';
import { formatLastSeenTimestamp } from '../format_last_seen_timestamp';
import type { SetupMode } from '../../setup_mode/types';

const getColumns = (
  setupMode: SetupMode,
  alerts: AlertsByName,
  dateFormat: string,
  staleStatusThresholdSeconds: number
) => {
  const columns = [
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.nameColumnTitle', {
        defaultMessage: 'Name',
      }),
      field: 'name',
      render: (name: string, kibana: any) => {
        let setupModeStatus = null;
        if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
          const list = get(setupMode, 'data.byUuid', {});
          const uuid = get(kibana, 'kibana.uuid');
          const status = list[uuid] || {};
          const instance = {
            uuid,
            name: kibana.name,
          };

          setupModeStatus = (
            <div className="monTableCell__setupModeStatus">
              <SetupModeBadge
                setupMode={setupMode}
                status={status}
                instance={instance}
                productName={KIBANA_SYSTEM_ID}
              />
            </div>
          );
          if (status.isNetNewUser) {
            return (
              <div>
                {name}
                {setupModeStatus}
              </div>
            );
          }
        }

        return (
          <div>
            <EuiLink
              href={getSafeForExternalLink(`#/kibana/instances/${kibana.kibana.uuid}`)}
              data-test-subj={`kibanaLink-${name}`}
            >
              {name}
            </EuiLink>
            {setupModeStatus}
          </div>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.alertsColumnTitle', {
        defaultMessage: 'Alerts',
      }),
      field: 'alerts_column',
      width: '175px',
      sortable: true,
      render: () => <AlertsStatus showBadge={true} alerts={alerts} />,
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.lastReportedStatusColumnTitle', {
        defaultMessage: 'Last Reported Status',
      }),
      field: 'status',
      render: (status: string) => {
        return (
          <EuiHealth color={statusIconColor(status)} data-test-subj="status">
            {capitalize(status)}
          </EuiHealth>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.lastSeenColumnTitle', {
        defaultMessage: 'Last Seen',
      }),
      field: 'lastSeenTimestamp',
      render: (
        lastSeenTimestampRaw: string,
        kibana: Pick<ElasticsearchSourceKibanaStats, 'kibana'> & { statusIsStale: boolean }
      ) => {
        const lastSeenTimestamp = prepareLastSeenTimestamp(lastSeenTimestampRaw, dateFormat);
        const staleMessage = i18n.translate('xpack.monitoring.kibana.listing.staleStatusTooltip', {
          defaultMessage:
            "It's been more than {staleStatusThresholdSeconds} seconds since we have heard from this instance.",
          values: {
            staleStatusThresholdSeconds,
          },
        });
        return (
          <span data-test-subj="lastSeen">
            {lastSeenTimestamp}
            {kibana.statusIsStale && (
              <>
                &nbsp;
                <EuiIconTip
                  aria-label={staleMessage}
                  content={staleMessage}
                  size="l"
                  type="alert"
                  color="warning"
                />
              </>
            )}
          </span>
        );
      },
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.loadAverageColumnTitle', {
        defaultMessage: 'Load Average',
      }),
      field: 'os.load.1m',
      render: (value: string) => <span>{formatMetric(value, '0.00')}</span>,
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.memorySizeColumnTitle', {
        defaultMessage: 'Memory Size',
      }),
      field: 'process.memory.resident_set_size_in_bytes',
      render: (value: string) => <span>{formatNumber(value, 'byte')}</span>,
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.requestsColumnTitle', {
        defaultMessage: 'Requests',
      }),
      field: 'requests.total',
      render: (value: string) => <span>{formatNumber(value, 'int_commas')}</span>,
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.responseTimeColumnTitle', {
        defaultMessage: 'Response Times',
      }),
      // It is possible this does not exist through MB collection
      field: 'response_times.average',
      render: (value: string, kibana: ElasticsearchSourceKibanaStats['kibana']) => {
        if (!value) {
          return null;
        }

        return (
          <div>
            <div className="monTableCell__splitNumber">
              {formatNumber(value, 'int_commas') + ' ms avg'}
            </div>
            <div className="monTableCell__splitNumber">
              {formatNumber(kibana?.response_times?.max, 'int_commas')} ms max
            </div>
          </div>
        );
      },
    },
  ];

  return columns;
};

interface Props {
  clusterStatus: any;
  alerts: AlertsByName;
  setupMode: SetupMode;
  sorting: Sorting;
  pagination: Pagination;
  onTableChange: (e: TableChange) => void;
  instances: ElasticsearchSourceKibanaStats[];
}

export const KibanaInstances: React.FC<Props> = (props: Props) => {
  const { clusterStatus, alerts, setupMode, sorting, pagination, onTableChange } = props;

  const { staleStatusThresholdSeconds } = React.useContext(ExternalConfigContext);
  const dateFormat = useUiSetting<string>('dateFormat');

  let setupModeCallOut = null;
  // Merge the instances data with the setup data if enabled
  const instances = props.instances || [];
  if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
    // We want to create a seamless experience for the user by merging in the setup data
    // and the node data from monitoring indices in the likely scenario where some instances
    // are using MB collection and some are using no collection
    const instancesByUuid = instances.reduce(
      (byUuid: { [uuid: string]: ElasticsearchSourceKibanaStats }, instance) => ({
        ...byUuid,
        [instance.kibana?.uuid ?? '']: instance,
      }),
      {}
    );

    instances.push(
      ...Object.entries(setupMode.data.byUuid).reduce((_instances: any, [nodeUuid, instance]) => {
        if (!instancesByUuid[nodeUuid]) {
          _instances.push({
            kibana: {
              ...(instance as any).instance.kibana,
              status: STATUS_ICON_TYPES.GRAY,
            },
          });
        }
        return _instances;
      }, [])
    );

    setupModeCallOut = (
      <ListingCallOut
        setupModeData={setupMode.data}
        productName={KIBANA_SYSTEM_ID}
        customRenderer={() => {
          const customRenderResponse = {
            shouldRender: false,
            componentToRender: null,
          };

          const hasInstances = setupMode.data.totalUniqueInstanceCount > 0;
          if (!hasInstances) {
            customRenderResponse.shouldRender = true;
            // @ts-ignore
            customRenderResponse.componentToRender = (
              <Fragment>
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.monitoring.kibana.instances.metricbeatMigration.detectedNodeTitle',
                    {
                      defaultMessage: 'Kibana instance detected',
                    }
                  )}
                  color="warning"
                  iconType="flag"
                >
                  <p>
                    {i18n.translate(
                      'xpack.monitoring.kibana.instances.metricbeatMigration.detectedNodeDescription',
                      {
                        defaultMessage: `The following instances are not monitored.
                        Click 'Monitor with Metricbeat' below to start monitoring.`,
                      }
                    )}
                  </p>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </Fragment>
            );
          }

          return customRenderResponse;
        }}
      />
    );
  }

  const dataFlattened = instances.map((item) => ({
    ...item,
    name: item.kibana?.name,
    status: item.kibana?.status,
  }));

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.kibana.instances.heading"
              defaultMessage="Kibana instances"
            />
          </h1>
        </EuiScreenReaderOnly>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} alerts={alerts} />
        </EuiPanel>
        <EuiSpacer size="m" />
        {setupModeCallOut}
        <EuiPageContent>
          <EuiMonitoringTable
            className="kibanaInstancesTable"
            rows={dataFlattened}
            columns={getColumns(setupMode, alerts, dateFormat, staleStatusThresholdSeconds)}
            sorting={sorting}
            pagination={pagination}
            setupMode={setupMode}
            productName={KIBANA_SYSTEM_ID}
            search={{
              box: {
                incremental: true,
                placeholder: i18n.translate(
                  'xpack.monitoring.kibana.listing.filterInstancesPlaceholder',
                  {
                    defaultMessage: 'Filter Instances…',
                  }
                ),
              },
            }}
            onTableChange={onTableChange}
            executeQueryOptions={{
              defaultFields: ['name'],
            }}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

function statusIconColor(status: string) {
  switch (status) {
    case 'red':
      return 'danger';
    case 'yellow':
      return 'warning';
    case 'green':
      return 'success';
    default:
      return 'subdued';
  }
}

function prepareLastSeenTimestamp(lastSeenTimestampRaw: string, dateFormat: string) {
  const { shouldShowRelativeTime, formattedTimestamp, relativeTime } = formatLastSeenTimestamp(
    lastSeenTimestampRaw,
    dateFormat
  );

  if (shouldShowRelativeTime) {
    return (
      <EuiToolTip position="top" content={formattedTimestamp}>
        <span>{relativeTime}</span>
      </EuiToolTip>
    );
  }

  return formattedTimestamp;
}
