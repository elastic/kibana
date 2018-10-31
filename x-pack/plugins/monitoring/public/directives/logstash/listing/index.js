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
import {
  EuiLink,
} from '@elastic/eui';
import { MonitoringTable } from 'plugins/monitoring/components/table';
import { SORT_ASCENDING } from '../../../../common/constants';
import {
  formatNumber,
  formatPercentageUsage
} from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

const filterFields = [ 'logstash.name', 'logstash.host', 'logstash.http_address' ];
const columns = [
  {
    title: i18n.translate('xpack.monitoring.logstash.nodes.nameTitle', {
      defaultMessage: 'Name'
    }),
    sortKey: 'logstash.name',
    sortOrder: SORT_ASCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.logstash.nodes.cpuUsageTitle', {
      defaultMessage: 'CPU Usage'
    }),
    sortKey: 'process.cpu.percent'
  },
  {
    title: i18n.translate('xpack.monitoring.logstash.nodes.loadAverageTitle', {
      defaultMessage: 'Load Average'
    }),
    sortKey: 'os.cpu.load_average.1m',
  },
  {
    title: i18n.translate('xpack.monitoring.logstash.nodes.jvmHeapUsedTitle', {
      defaultMessage: '{javaVirtualMachine} Heap Used',
      values: { javaVirtualMachine: 'JVM' }
    }),
    sortKey: 'jvm.mem.heap_used_percent'
  },
  {
    title: i18n.translate('xpack.monitoring.logstash.nodes.eventsIngestedTitle', {
      defaultMessage: 'Events Ingested'
    }),
    sortKey: 'events.out'
  },
  {
    title: i18n.translate('xpack.monitoring.logstash.nodes.configReloadsTitle', {
      defaultMessage: 'Config Reloads'
    })
  },
  {
    title: i18n.translate('xpack.monitoring.logstash.nodes.versionTitle', {
      defaultMessage: 'Version'
    }),
    sortKey: 'logstash.version'
  }
];
const nodeRowFactory = (scope, kbnUrl) => {
  const goToNode = uuid => {
    scope.$evalAsync(() => {
      kbnUrl.changePath(`/logstash/node/${uuid}`);
    });
  };

  return function NodeRow(props) {
    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monTableCell__name">
            <EuiLink
              onClick={goToNode.bind(null, get(props, 'logstash.uuid'))}
            >
              { get(props, 'logstash.name') }
            </EuiLink>
          </div>
          <div className="monTableCell__transportAddress">{ get(props, 'logstash.http_address') }</div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__number">
            { formatPercentageUsage(props.process.cpu.percent, 100) }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__number">
            { formatNumber(get(props, 'os.cpu.load_average["1m"]'), '0.00') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__number">
            { formatPercentageUsage(props.jvm.mem.heap_used_percent, 100) }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__number">
            { formatNumber(props.events.out, '0.[0]a') }
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__splitNumber">
            <FormattedMessage
              id="xpack.monitoring.logstash.nodes.configReloadsSuccessCountLabel"
              defaultMessage="{reloadsSuccesses} successes"
              values={{ reloadsSuccesses: props.reloads.successes }}
            />
          </div>
          <div className="monTableCell__splitNumber">
            <FormattedMessage
              id="xpack.monitoring.logstash.nodes.configReloadsFailuresCountLabel"
              defaultMessage="{reloadsFailures} failures"
              values={{ reloadsFailures: props.reloads.failures }}
            />
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <div className="monTableCell__version">
            { formatNumber(get(props, 'logstash.version')) }
          </div>
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringLogstashNodeListing', (kbnUrl, i18n) => {
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
    link: function (scope, $el) {

      scope.$watch('nodes', (nodes = []) => {
        const filterNodesPlaceholder = i18n('xpack.monitoring.logstash.filterNodesPlaceholder', { defaultMessage: 'Filter Nodes…' });
        const nodesTable = (
          <I18nProvider>
            <MonitoringTable
              className="logstashNodesTable"
              rows={nodes}
              pageIndex={scope.pageIndex}
              filterText={scope.filterText}
              sortKey={scope.sortKey}
              sortOrder={scope.sortOrder}
              onNewState={scope.onNewState}
              placeholder={filterNodesPlaceholder}
              filterFields={filterFields}
              columns={columns}
              rowComponent={nodeRowFactory(scope, kbnUrl)}
            />
          </I18nProvider>
        );
        render(nodesTable, $el[0]);
      });

    }
  };
});
