/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import moment from 'moment';
import { partialRight } from 'lodash';
import { uiModules } from 'ui/modules';
import {
  KuiTableRowCell,
  KuiTableRow,
  KuiFlexGroup,
  KuiFlexItem,
  KuiEmptyTablePrompt
} from '@kbn/ui-framework/components';
import {
  EuiLink,
} from '@elastic/eui';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { Sparkline } from 'plugins/monitoring/components/sparkline';
import { SORT_ASCENDING } from '../../../../common/constants';
import { formatMetric } from '../../../lib/format_number';

const filterFields = [ 'id' ];
const columns = [
  { title: 'ID', sortKey: 'id', sortOrder: SORT_ASCENDING },
  { title: 'Events Emitted Rate', sortKey: 'latestThroughput' },
  { title: 'Number of Nodes', sortKey: 'latestNodesCount', }
];

const pipelineRowFactory = (onPipelineClick, onBrush, tooltipXValueFormatter, tooltipYValueFormatter) => {

  return function PipelineRow({ id, metrics, latestThroughput, latestNodesCount }) {
    const throughputMetric = metrics.throughput;
    const nodesCountMetric = metrics.nodesCount;

    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monitoringTableCell__name">
            <EuiLink
              onClick={onPipelineClick.bind(null, id)}
              data-test-subj="id"
            >
              { id }
            </EuiLink>
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <KuiFlexGroup
            gutterSize="none"
            alignItems="center"
          >
            <KuiFlexItem>
              <Sparkline
                series={throughputMetric.data}
                onBrush={onBrush}
                tooltip={{
                  xValueFormatter: tooltipXValueFormatter,
                  yValueFormatter: partialRight(tooltipYValueFormatter, throughputMetric.metric.format, throughputMetric.metric.units)
                }}
                options={{ xaxis: throughputMetric.timeRange }}
              />
            </KuiFlexItem>
            <KuiFlexItem
              className="monitoringTableCell__number"
              data-test-subj="eventsEmittedRate"
            >
              { formatMetric(latestThroughput, '0.[0]a', throughputMetric.metric.units) }
            </KuiFlexItem>
          </KuiFlexGroup>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <KuiFlexGroup
            gutterSize="none"
            alignItems="center"
          >
            <KuiFlexItem>
              <Sparkline
                series={nodesCountMetric.data}
                onBrush={onBrush}
                tooltip={{
                  xValueFormatter: tooltipXValueFormatter,
                  yValueFormatter: partialRight(tooltipYValueFormatter, nodesCountMetric.metric.format, nodesCountMetric.metric.units)
                }}
                options={{ xaxis: nodesCountMetric.timeRange }}
              />
            </KuiFlexItem>
            <KuiFlexItem
              className="monitoringTableCell__number"
              data-test-subj="nodeCount"
            >
              { formatMetric(latestNodesCount, '0a') }
            </KuiFlexItem>
          </KuiFlexGroup>
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringLogstashPipelineListing', ($injector) => {
  const kbnUrl = $injector.get('kbnUrl');
  const timefilter = $injector.get('timefilter');
  const config = $injector.get('config');

  const dateFormat = config.get('dateFormat');

  return {
    restrict: 'E',
    scope: {
      pipelines: '=',
      pageIndex: '=',
      filterText: '=',
      sortKey: '=',
      sortOrder: '=',
      onNewState: '=',
      upgradeMessage: '@',
    },
    link: function (scope, $el) {

      function onBrush(xaxis) {
        scope.$evalAsync(() => {
          timefilter.time.from = moment(xaxis.from);
          timefilter.time.to = moment(xaxis.to);
          timefilter.time.mode = 'absolute';
        });
      }

      function onPipelineClick(id) {
        const url = `/logstash/pipelines/${id}`;
        scope.$evalAsync(() => kbnUrl.changePath(url));
      }

      function tooltipXValueFormatter(xValue) {
        return moment(xValue).format(dateFormat);
      }

      function tooltipYValueFormatter(yValue, format, units) {
        return formatMetric(yValue, format, units);
      }

      scope.$watch('pipelines', (pipelines = []) => {
        if (scope.upgradeMessage) {
          render(<KuiEmptyTablePrompt message={scope.upgradeMessage} />, $el[0]);
          return;
        }

        const pipelinesTable = (
          <MonitoringTable
            className="logstashPipelinesTable"
            rows={pipelines}
            pageIndex={scope.pageIndex}
            filterText={scope.filterText}
            sortKey={scope.sortKey}
            sortOrder={scope.sortOrder}
            onNewState={scope.onNewState}
            placeholder="Filter Pipelines..."
            filterFields={filterFields}
            columns={columns}
            rowComponent={pipelineRowFactory(onPipelineClick, onBrush, tooltipXValueFormatter, tooltipYValueFormatter)}
          />
        );
        render(pipelinesTable, $el[0]);
      });

      scope.$on('$destroy', () => unmountComponentAtNode($el[0]));
    }
  };
});
