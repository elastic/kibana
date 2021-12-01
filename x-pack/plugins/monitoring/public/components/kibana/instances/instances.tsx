/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiLink,
  EuiCallOut,
  EuiScreenReaderOnly,
  EuiToolTip,
  EuiHealth,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { capitalize, get } from 'lodash';
// @ts-ignore
import { ClusterStatus } from '../cluster_status';
// @ts-ignore
import { EuiMonitoringTable } from '../../table';
import { STATUS_ICON_TYPES } from '../../status_icon';
// @ts-ignore
import { formatMetric, formatNumber } from '../../../lib/format_number';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
// @ts-ignore
import { SetupModeBadge } from '../../setup_mode/badge';
import { KIBANA_SYSTEM_ID } from '../../../../common/constants';
import { CommonAlertStatus } from '../../../../common/types/alerts';
import { ElasticsearchSourceKibanaStats } from '../../../../common/types/es';
// @ts-ignore
import { ListingCallOut } from '../../setup_mode/listing_callout';
import { AlertsStatus } from '../../../alerts/status';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';

const getColumns = (setupMode: any, alerts: { [alertTypeId: string]: CommonAlertStatus[] }) => {
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
      field: 'isOnline',
      width: '175px',
      sortable: true,
      render: () => <AlertsStatus showBadge={true} alerts={alerts} />,
    },
    {
      name: i18n.translate('xpack.monitoring.kibana.listing.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      field: 'status',
      render: (
        status: string,
        kibana: Pick<ElasticsearchSourceKibanaStats, 'kibana'> & { availability: boolean }
      ) => {
        return (
          <EuiToolTip content={status} position="bottom">
            <EuiHealth
              color={kibana.availability ? 'success' : 'subdued'}
              data-test-subj="statusIcon"
            >
              {capitalize(status)}
            </EuiHealth>
          </EuiToolTip>
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
  alerts: { [alertTypeId: string]: CommonAlertStatus[] };
  setupMode: any;
  sorting: any;
  pagination: any;
  onTableChange: any;
  instances: ElasticsearchSourceKibanaStats[];
}

export const KibanaInstances: React.FC<Props> = (props: Props) => {
  const { clusterStatus, alerts, setupMode, sorting, pagination, onTableChange } = props;

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
        useNodeIdentifier={false}
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
            columns={getColumns(setupMode, alerts)}
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
