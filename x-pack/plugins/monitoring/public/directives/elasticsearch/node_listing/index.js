/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import { MetricCell, OfflineCell } from 'plugins/monitoring/components/elasticsearch/node_listing/cells';
import { NodeStatusIcon } from 'plugins/monitoring/components/elasticsearch/node/status_icon';
import { Tooltip } from 'plugins/monitoring/components/tooltip';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { extractIp } from 'plugins/monitoring/lib/extract_ip';
import { SORT_ASCENDING } from '../../../../common/constants';
import {
  EuiLink,
} from '@elastic/eui';

const filterFields = [ 'node.name', 'status', 'type', 'transport_address' ];
const getColumns = showCgroupMetricsElasticsearch => {
  const cols = [];
  cols.push({ title: 'Name', sortKey: 'node.name', sortOrder: SORT_ASCENDING });
  cols.push({ title: 'Status', sortKey: 'online' });
  if (showCgroupMetricsElasticsearch) {
    cols.push({ title: 'CPU Usage', sortKey: 'node_cgroup_quota.lastVal' });
    cols.push({ title: 'CPU Throttling', sortKey: 'node_cgroup_throttled.lastVal' });
  } else {
    cols.push({ title: 'CPU Usage', sortKey: 'node_cpu_utilization.lastVal' });
    cols.push({ title: 'Load Average', sortKey: 'node_load_average.lastVal' });
  }
  cols.push({ title: 'JVM Memory', sortKey: 'node_jvm_mem_percent.lastVal' });
  cols.push({ title: 'Disk Free Space', sortKey: 'node_free_space.lastVal' });
  cols.push({ title: 'Shards', sortKey: 'shardCount' });
  return cols;
};
const nodeRowFactory = (scope, kbnUrl, showCgroupMetricsElasticsearch) => {
  return class NodeRow extends React.Component {
    constructor(props) {
      super(props);
      this.goToNode = this.goToNode.bind(this);
    }
    goToNode() {
      scope.$evalAsync(() => {
        kbnUrl.changePath(`/elasticsearch/nodes/${this.props.resolver}`);
      });
    }
    isOnline() {
      return this.props.status === 'Online';
    }
    getCpuComponents() {
      const isOnline = this.isOnline();
      if (showCgroupMetricsElasticsearch) {
        return [
          <MetricCell key="cpuCol1" isOnline={isOnline} metric={get(this.props, 'node_cgroup_quota')} isPercent={true} />,
          <MetricCell key="cpuCol2" isOnline={isOnline} metric={get(this.props, 'node_cgroup_throttled')} isPercent={false} />,
        ];
      }
      return [
        <MetricCell key="cpuCol1" isOnline={isOnline} metric={get(this.props, 'node_cpu_utilization')} isPercent={true} />,
        <MetricCell key="cpuCol2" isOnline={isOnline} metric={get(this.props, 'node_load_average')} isPercent={false} />,
      ];
    }
    getShardCount() {
      if (this.isOnline()) {
        return (
          <KuiTableRowCell>
            <div className="monitoringTableCell__number">
              {get(this.props, 'shardCount')}
            </div>
          </KuiTableRowCell>
        );
      }
      return <OfflineCell />;
    }
    render() {
      const isOnline = this.isOnline();
      return (
        <KuiTableRow>
          <KuiTableRowCell>
            <div className="monitoringTableCell__name">
              <Tooltip text={this.props.nodeTypeLabel} trigger="hover" placement="bottom">
                <span className={`fa ${this.props.nodeTypeClass}`} />
              </Tooltip>
              &nbsp;
              <EuiLink
                onClick={this.goToNode}
                data-test-subj={`nodeLink-${this.props.resolver}`}
              >
                {this.props.name}
              </EuiLink>
            </div>
            <div className="monitoringTableCell__transportAddress">{extractIp(this.props.transport_address)}</div>
          </KuiTableRowCell>
          <KuiTableRowCell>
            <div title={`Node status: ${this.props.status}`} className="monitoringTableCell__status">
              <NodeStatusIcon status={this.props.status} />&nbsp;
              {this.props.status}
            </div>
          </KuiTableRowCell>
          {this.getCpuComponents()}
          <MetricCell isOnline={isOnline} metric={get(this.props, 'node_jvm_mem_percent')} isPercent={true} />
          <MetricCell isOnline={isOnline} metric={get(this.props, 'node_free_space')} isPercent={false} />
          {this.getShardCount()}
        </KuiTableRow>
      );
    }
  };
};

// change the node to actually display the name
const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringNodesListing', ($injector) => {
  const kbnUrl = $injector.get('kbnUrl');
  const showCgroupMetricsElasticsearch = $injector.get('showCgroupMetricsElasticsearch');
  const columns = getColumns(showCgroupMetricsElasticsearch);

  return {
    restrict: 'E',
    scope: {
      nodes: '=',
      pageIndex: '=',
      filterText: '=',
      sortKey: '=',
      sortOrder: '=',
      onNewState: '=',
    },
    link(scope, $el) {

      scope.$watch('nodes', (nodes = []) => {
        const nodesTable = (
          <MonitoringTable
            className="nodesTable"
            rows={nodes}
            pageIndex={scope.pageIndex}
            filterText={scope.filterText}
            sortKey={scope.sortKey}
            sortOrder={scope.sortOrder}
            onNewState={scope.onNewState}
            placeholder="Filter Nodes..."
            filterFields={filterFields}
            columns={columns}
            rowComponent={nodeRowFactory(scope, kbnUrl, showCgroupMetricsElasticsearch)}
          />
        );
        render(nodesTable, $el[0]);
      });

    }
  };
});
