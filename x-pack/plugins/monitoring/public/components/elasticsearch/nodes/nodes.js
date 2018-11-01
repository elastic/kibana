/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { get } from 'lodash';
import { SORT_ASCENDING } from '../../../../common/constants';
import { NodeStatusIcon } from '../node';
import { extractIp } from '../../../lib/extract_ip'; // TODO this is only used for elasticsearch nodes summary / node detail, so it should be moved to components/elasticsearch/nodes/lib
import { ClusterStatus } from '../cluster_status';
import { MonitoringTable } from '../../table';
import { MetricCell, OfflineCell } from './cells';
import { EuiLink, EuiToolTip } from '@elastic/eui';
import { KuiTableRowCell, KuiTableRow } from '@kbn/ui-framework/components';
import { i18n } from '@kbn/i18n';
import { injectI18n } from '@kbn/i18n/react';

const filterFields = ['name'];
const getColumns = showCgroupMetricsElasticsearch => {
  const cols = [];
  cols.push({
    title: i18n.translate('xpack.monitoring.elasticsearch.nodes.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    sortKey: 'name',
    sortOrder: SORT_ASCENDING
  });
  cols.push({
    title: i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    sortKey: 'isOnline'
  });
  const cpuUsageColumnTitle = i18n.translate('xpack.monitoring.elasticsearch.nodes.cpuUsageColumnTitle', {
    defaultMessage: 'CPU Usage',
  });
  if (showCgroupMetricsElasticsearch) {
    cols.push({
      title: cpuUsageColumnTitle,
      sortKey: 'node_cgroup_quota'
    });
    cols.push({
      title: i18n.translate('xpack.monitoring.elasticsearch.nodes.cpuThrottlingColumnTitle', {
        defaultMessage: 'CPU Throttling',
      }),
      sortKey: 'node_cgroup_throttled'
    });
  } else {
    cols.push({
      title: cpuUsageColumnTitle,
      sortKey: 'node_cpu_utilization'
    });
    cols.push({
      title: i18n.translate('xpack.monitoring.elasticsearch.nodes.loadAverageColumnTitle', {
        defaultMessage: 'Load Average',
      }),
      sortKey: 'node_load_average'
    });
  }
  cols.push({
    title: i18n.translate('xpack.monitoring.elasticsearch.nodes.jvmMemoryColumnTitle', {
      defaultMessage: '{javaVirtualMachine} Memory',
      values: {
        javaVirtualMachine: 'JVM'
      }
    }),
    sortKey: 'node_jvm_mem_percent'
  });
  cols.push({
    title: i18n.translate('xpack.monitoring.elasticsearch.nodes.diskFreeSpaceColumnTitle', {
      defaultMessage: 'Disk Free Space',
    }),
    sortKey: 'node_free_space'
  });
  cols.push({
    title: i18n.translate('xpack.monitoring.elasticsearch.nodes.shardsColumnTitle', {
      defaultMessage: 'Shards',
    }),
    sortKey: 'shardCount'
  });
  return cols;
};

const nodeRowFactory = showCgroupMetricsElasticsearch => {
  return class NodeRow extends React.Component {
    constructor(props) {
      super(props);
    }

    isOnline() {
      return this.props.isOnline === true;
    }

    getCpuComponents() {
      const isOnline = this.isOnline();
      if (showCgroupMetricsElasticsearch) {
        return [
          <MetricCell
            key="cpuCol1"
            isOnline={isOnline}
            metric={get(this.props, 'node_cgroup_quota')}
            isPercent={true}
            data-test-subj="cpuQuota"
          />,
          <MetricCell
            key="cpuCol2"
            isOnline={isOnline}
            metric={get(this.props, 'node_cgroup_throttled')}
            isPercent={false}
            data-test-subj="cpuThrottled"
          />
        ];
      }
      return [
        <MetricCell
          key="cpuCol1"
          isOnline={isOnline}
          metric={get(this.props, 'node_cpu_utilization')}
          isPercent={true}
          data-test-subj="cpuUsage"
        />,
        <MetricCell
          key="cpuCol2"
          isOnline={isOnline}
          metric={get(this.props, 'node_load_average')}
          isPercent={false}
          data-test-subj="loadAverage"
        />
      ];
    }

    getShardCount() {
      if (this.isOnline()) {
        return (
          <KuiTableRowCell>
            <div className="monTableCell__number" data-test-subj="shards">
              {get(this.props, 'shardCount')}
            </div>
          </KuiTableRowCell>
        );
      }
      return <OfflineCell />;
    }

    render() {
      const isOnline = this.isOnline();
      const status = this.props.isOnline ? 'Online' : 'Offline';

      return (
        <KuiTableRow>
          <KuiTableRowCell>
            <div className="monTableCell__name">
              <EuiToolTip
                position="bottom"
                content={this.props.nodeTypeLabel}
              >
                <span className={`fa ${this.props.nodeTypeClass}`} />
              </EuiToolTip>
              &nbsp;
              <span data-test-subj="name">
                <EuiLink
                  href={`#/elasticsearch/nodes/${this.props.resolver}`}
                  data-test-subj={`nodeLink-${this.props.resolver}`}
                >
                  {this.props.name}
                </EuiLink>
              </span>
            </div>
            <div className="monTableCell__transportAddress">
              {extractIp(this.props.transport_address)}
            </div>
          </KuiTableRowCell>
          <KuiTableRowCell>
            <div className="monTableCell__status">
              <NodeStatusIcon
                isOnline={this.props.isOnline}
                status={status}
              />{' '}
              {status}
            </div>
          </KuiTableRowCell>
          {this.getCpuComponents()}
          <MetricCell
            isOnline={isOnline}
            metric={get(this.props, 'node_jvm_mem_percent')}
            isPercent={true}
            data-test-subj="jvmMemory"
          />
          <MetricCell
            isOnline={isOnline}
            metric={get(this.props, 'node_free_space')}
            isPercent={false}
            data-test-subj="diskFreeSpace"
          />
          {this.getShardCount()}
        </KuiTableRow>
      );
    }
  };
};

function ElasticsearchNodesUI({ clusterStatus, nodes, showCgroupMetricsElasticsearch, intl, ...props }) {
  const columns = getColumns(showCgroupMetricsElasticsearch);

  return (
    <Fragment>
      <ClusterStatus stats={clusterStatus} />

      <MonitoringTable
        className="elasticsearchNodesTable"
        rows={nodes}
        pageIndex={props.pageIndex}
        filterText={props.filterText}
        sortKey={props.sortKey}
        sortOrder={props.sortOrder}
        onNewState={props.onNewState}
        placeholder={intl.formatMessage({
          id: 'xpack.monitoring.elasticsearch.nodes.monitoringTablePlaceholder',
          defaultMessage: 'Filter Nodes…',
        })}
        filterFields={filterFields}
        columns={columns}
        rowComponent={nodeRowFactory(showCgroupMetricsElasticsearch)}
      />
    </Fragment>
  );
}

export const ElasticsearchNodes = injectI18n(ElasticsearchNodesUI);
