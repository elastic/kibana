/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import { get } from 'lodash';
import {
  EuiPage,
  EuiLink,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { formatPercentageUsage, formatNumber } from '../../../lib/format_number';
import { ClusterStatus } from '../cluster_status';
import { EuiMonitoringTable } from '../../table';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { LOGSTASH_SYSTEM_ID } from '../../../../common/constants';
import { SetupModeBadge } from '../../setup_mode/badge';
import { ListingCallOut } from '../../setup_mode/listing_callout';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { AlertsStatus } from '../../../alerts/status';
import { isSetupModeFeatureEnabled } from '../../../lib/setup_mode';
import { SetupModeFeature } from '../../../../common/enums';

export class Listing extends PureComponent {
  getColumns() {
    const setupMode = this.props.setupMode;
    const alerts = this.props.alerts;

    return [
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.nameTitle', {
          defaultMessage: 'Name',
        }),
        field: 'name',
        sortable: true,
        render: (name, node) => {
          let setupModeStatus = null;
          if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
            const list = get(setupMode, 'data.byUuid', {});
            const uuid = get(node, 'logstash.uuid');
            const status = list[uuid] || {};
            const instance = {
              uuid,
              name: node.name,
            };

            setupModeStatus = (
              <div className="monTableCell__setupModeStatus">
                <SetupModeBadge
                  setupMode={setupMode}
                  status={status}
                  instance={instance}
                  productName={LOGSTASH_SYSTEM_ID}
                />
              </div>
            );
          }

          return (
            <div>
              <div data-test-subj="name">
                <EuiLink
                  href={getSafeForExternalLink(`#/logstash/node/${node.logstash.uuid}`)}
                  data-test-subj={`nodeLink-${node.logstash.uuid}`}
                >
                  {name}
                </EuiLink>
              </div>
              <div data-test-subj="httpAddress">{node.logstash.http_address}</div>
              {setupModeStatus}
            </div>
          );
        },
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.alertsColumnTitle', {
          defaultMessage: 'Alerts',
        }),
        field: 'isOnline',
        width: '175px',
        sortable: true,
        render: () => <AlertsStatus showBadge={true} alerts={alerts} />,
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.cpuUsageTitle', {
          defaultMessage: 'CPU Usage',
        }),
        field: 'cpu_usage',
        sortable: true,
        render: (value) => (
          <span data-test-subj="cpuUsage">{formatPercentageUsage(value, 100)}</span>
        ),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.loadAverageTitle', {
          defaultMessage: 'Load Average',
        }),
        field: 'load_average',
        sortable: true,
        render: (value) => <span data-test-subj="loadAverage">{formatNumber(value, '0.00')}</span>,
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.jvmHeapUsedTitle', {
          defaultMessage: '{javaVirtualMachine} Heap Used',
          values: { javaVirtualMachine: 'JVM' },
        }),
        field: 'jvm_heap_used',
        sortable: true,
        render: (value) => (
          <span data-test-subj="jvmHeapUsed">{formatPercentageUsage(value, 100)}</span>
        ),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.eventsIngestedTitle', {
          defaultMessage: 'Events Ingested',
        }),
        field: 'events_out',
        sortable: true,
        render: (value) => <span data-test-subj="eventsOut">{formatNumber(value, '0.[0]a')}</span>,
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.configReloadsTitle', {
          defaultMessage: 'Config Reloads',
        }),
        sortable: true,
        render: (node) => (
          <div>
            <div data-test-subj="configReloadsSuccess">
              <FormattedMessage
                id="xpack.monitoring.logstash.nodes.configReloadsSuccessCountLabel"
                defaultMessage="{reloadsSuccesses} successes"
                values={{ reloadsSuccesses: node.reloads.successes }}
              />
            </div>
            <div data-test-subj="configReloadsFailure">
              <FormattedMessage
                id="xpack.monitoring.logstash.nodes.configReloadsFailuresCountLabel"
                defaultMessage="{reloadsFailures} failures"
                values={{ reloadsFailures: node.reloads.failures }}
              />
            </div>
          </div>
        ),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.nodes.versionTitle', {
          defaultMessage: 'Version',
        }),
        field: 'version',
        sortable: true,
        render: (value) => <span data-test-subj="version">{formatNumber(value)}</span>,
      },
    ];
  }

  render() {
    const { stats, alerts, sorting, pagination, onTableChange, data, setupMode } = this.props;
    const columns = this.getColumns();
    const flattenedData = data.map((item) => ({
      ...item,
      name: get(item, 'logstash.name', 'N/A'),
      cpu_usage: get(item, 'process.cpu.percent', 'N/A'),
      load_average: get(item, 'os.cpu.load_average.1m', 'N/A'),
      jvm_heap_used: get(item, 'jvm.mem.heap_used_percent', 'N/A'),
      events_out: get(item, 'events.out', 'N/A'),
      version: get(item, 'logstash.version', 'N/A'),
    }));

    let setupModeCallOut = null;
    if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
      setupModeCallOut = (
        <ListingCallOut
          setupModeData={setupMode.data}
          useNodeIdentifier
          productName={LOGSTASH_SYSTEM_ID}
        />
      );
    }

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.logstash.instances.heading"
                defaultMessage="Logstash instances"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiPanel>
            <ClusterStatus stats={stats} alerts={alerts} />
          </EuiPanel>
          <EuiSpacer size="m" />
          {setupModeCallOut}
          <EuiPageContent>
            <EuiMonitoringTable
              className="logstashNodesTable"
              rows={flattenedData}
              setupMode={setupMode}
              productName={LOGSTASH_SYSTEM_ID}
              columns={columns}
              sorting={{
                ...sorting,
                sort: {
                  ...sorting.sort,
                  field: 'name',
                },
              }}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate('xpack.monitoring.logstash.filterNodesPlaceholder', {
                    defaultMessage: 'Filter Nodes…',
                  }),
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
  }
}
