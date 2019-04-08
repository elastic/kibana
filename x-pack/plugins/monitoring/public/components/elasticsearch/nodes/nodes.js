/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { get } from 'lodash';
import { NodeStatusIcon } from '../node';
import { extractIp } from '../../../lib/extract_ip'; // TODO this is only used for elasticsearch nodes summary / node detail, so it should be moved to components/elasticsearch/nodes/lib
import { ClusterStatus } from '../cluster_status';
import { EuiMonitoringTable } from '../../table';
import { MetricCell, OfflineCell } from './cells';
import {
  EuiLink,
  EuiToolTip,
  EuiSpacer,
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiPanel,
  EuiButton,
  EuiBadge
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { injectI18n } from '@kbn/i18n/react';
import { Flyout } from '../../metricbeat_migration/flyout';

const getColumns = (showCgroupMetricsElasticsearch, setupMode, openFlyout = null) => {
  const cols = [];

  const cpuUsageColumnTitle = i18n.translate('xpack.monitoring.elasticsearch.nodes.cpuUsageColumnTitle', {
    defaultMessage: 'CPU Usage',
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    field: 'name',
    sortable: true,
    render: (value, node) => (
      <div>
        <div className="monTableCell__name">
          <EuiToolTip
            position="bottom"
            content={node.nodeTypeLabel}
          >
            <span className={`fa ${node.nodeTypeClass}`} />
          </EuiToolTip>
          &nbsp;
          <span data-test-subj="name">
            <EuiLink
              href={`#/elasticsearch/nodes/${node.resolver}`}
              data-test-subj={`nodeLink-${node.resolver}`}
            >
              {value}
            </EuiLink>
          </span>
        </div>
        <div className="monTableCell__transportAddress">
          {extractIp(node.transport_address)}
        </div>
      </div>
    )
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    field: 'isOnline',
    sortable: true,
    render: value => {
      const status = value ? i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumn.onlineLabel', {
        defaultMessage: 'Online',
      }) : i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumn.offlineLabel', {
        defaultMessage: 'Offline',
      });
      return (
        <div className="monTableCell__status">
          <NodeStatusIcon
            isOnline={value}
            status={status}
          />{' '}
          {status}
        </div>
      );
    }
  });

  if (showCgroupMetricsElasticsearch) {
    cols.push({
      name: cpuUsageColumnTitle,
      field: 'node_cgroup_quota',
      sortable: true,
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={true}
          data-test-subj="cpuQuota"
        />
      )
    });

    cols.push({
      name: i18n.translate('xpack.monitoring.elasticsearch.nodes.cpuThrottlingColumnTitle', {
        defaultMessage: 'CPU Throttling',
      }),
      field: 'node_cgroup_throttled',
      sortable: true,
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={false}
          data-test-subj="cpuThrottled"
        />
      )
    });
  } else {
    cols.push({
      name: cpuUsageColumnTitle,
      field: 'node_cpu_utilization',
      sortable: true,
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={true}
          data-test-subj="cpuUsage"
        />
      )
    });

    cols.push({
      name: i18n.translate('xpack.monitoring.elasticsearch.nodes.loadAverageColumnTitle', {
        defaultMessage: 'Load Average',
      }),
      field: 'node_load_average',
      sortable: true,
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={false}
          data-test-subj="loadAverage"
        />
      )
    });
  }

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.jvmMemoryColumnTitle', {
      defaultMessage: '{javaVirtualMachine} Memory',
      values: {
        javaVirtualMachine: 'JVM'
      }
    }),
    field: 'node_jvm_mem_percent',
    sortable: true,
    render: (value, node) => (
      <MetricCell
        isOnline={node.isOnline}
        metric={value}
        isPercent={true}
        data-test-subj="jvmMemory"
      />
    )
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.diskFreeSpaceColumnTitle', {
      defaultMessage: 'Disk Free Space',
    }),
    field: 'node_free_space',
    sortable: true,
    width: '300px',
    render: (value, node) => (
      <MetricCell
        isOnline={node.isOnline}
        metric={value}
        isPercent={false}
        data-test-subj="diskFreeSpace"
      />
    )
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.shardsColumnTitle', {
      defaultMessage: 'Shards',
    }),
    field: 'shardCount',
    sortable: true,
    render: (value, node) => {
      return node.isOnline ? (
        <div className="monTableCell__number" data-test-subj="shards">
          {value}
        </div>
      ) : <OfflineCell/>;
    }
  });

  if (setupMode.enabled) {
    cols.push({
      name: 'Migration Status',
      field: 'resolver',
      render: uuid => {
        const list = get(setupMode, 'data.elasticsearch.byUuid', {});
        const status = list[uuid] || {};

        if (status.isInternalCollector) {
          return (
            <EuiButton color="danger" onClick={openFlyout}>
              Migrate
            </EuiButton>
          );
        }

        if (status.isFullyMigrated) {
          return (
            <EuiBadge color="secondary" iconType="check">
              Migrated
            </EuiBadge>
          );
        }

        console.log({ uuid, status, setupMode });
        return 'foo';
      }
    });
  }

  return cols;
};

class ElasticsearchNodesUI extends Component {
  state = { isFlyoutOpen: false }

  openFlyout = () => {
    this.setState({ isFlyoutOpen: true });
  }

  closeFlyout = () => {
    this.setState({ isFlyoutOpen: false });
  }

  render() {
    const {
      clusterStatus,
      nodes,
      showCgroupMetricsElasticsearch,
      intl,
      setupMode,
      sorting,
      pagination,
      onTableChange
    } = this.props;

    const columns = getColumns(showCgroupMetricsElasticsearch, setupMode, this.openFlyout);

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>
            <ClusterStatus stats={clusterStatus} />
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiPageContent>
            <EuiMonitoringTable
              className="elasticsearchNodesTable"
              rows={nodes}
              columns={columns}
              sorting={sorting}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: intl.formatMessage({
                    id: 'xpack.monitoring.elasticsearch.nodes.monitoringTablePlaceholder',
                    defaultMessage: 'Filter Nodes…',
                  }),
                },
              }}
              onTableChange={onTableChange}
              executeQueryOptions={{
                defaultFields: ['name']
              }}
            />
            { this.state.isFlyoutOpen ?
              <Flyout
                onClose={() => this.closeFlyout()}
                productName="elasticsearch"
                product={get(setupMode, 'data.elasticsearch')}
                updateProduct={setupMode.updateData}
                // products={capabilities}
                // updateCapabilities={() => this.updateCapabilities()}
              />
              : null
            }
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const ElasticsearchNodes = injectI18n(ElasticsearchNodesUI);
