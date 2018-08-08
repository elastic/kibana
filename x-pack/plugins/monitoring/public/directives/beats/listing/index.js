/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { uiModules } from 'ui/modules';
import { Stats } from 'plugins/monitoring/components/beats';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import {
  SORT_ASCENDING,
  SORT_DESCENDING,
  TABLE_ACTION_UPDATE_FILTER,
} from '../../../../common/constants';
import {
  KuiTableRowCell,
  KuiTableRow
} from '@kbn/ui-framework/components';
import { MonitoringTable } from 'plugins/monitoring/components/table';

import {
  EuiLink,
} from '@elastic/eui';

const filterFields = [ 'name', 'type', 'version', 'output' ];
const columns = [
  { title: 'Name', sortKey: 'name', sortOrder: SORT_ASCENDING },
  { title: 'Type', sortKey: 'type' },
  { title: 'Output Enabled', sortKey: 'output' },
  { title: 'Total Events Rate', sortKey: 'total_events_rate', secondarySortOrder: SORT_DESCENDING },
  { title: 'Bytes Sent Rate', sortKey: 'bytes_sent_rate' },
  { title: 'Output Errors', sortKey: 'errors' },
  { title: 'Allocated Memory', sortKey: 'memory' },
  { title: 'Version', sortKey: 'version' },
];
const beatRowFactory = (scope, kbnUrl) => {
  return props => {
    const goToBeat = uuid => () => {
      scope.$evalAsync(() => {
        kbnUrl.changePath(`/beats/beat/${uuid}`);
      });
    };
    const applyFiltering = filterText => () => {
      props.dispatchTableAction(TABLE_ACTION_UPDATE_FILTER, filterText);
    };

    return (
      <KuiTableRow>
        <KuiTableRowCell>
          <div className="monitoringTableCell__name">
            <EuiLink
              onClick={goToBeat(props.uuid)}
              data-test-subj={`beatLink-${props.name}`}
            >
              {props.name}
            </EuiLink>
          </div>
        </KuiTableRowCell>
        <KuiTableRowCell>
          <EuiLink
            onClick={applyFiltering(props.type)}
          >
            {props.type}
          </EuiLink>
        </KuiTableRowCell>
        <KuiTableRowCell>
          {props.output}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.total_events_rate, '', '/s')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.bytes_sent_rate, 'byte', '/s')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.errors, '0')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {formatMetric(props.memory, 'byte')}
        </KuiTableRowCell>
        <KuiTableRowCell>
          <EuiLink
            onClick={applyFiltering(props.version)}
          >
            {props.version}
          </EuiLink>
        </KuiTableRowCell>
      </KuiTableRow>
    );
  };
};

const uiModule = uiModules.get('monitoring/directives', []);
uiModule.directive('monitoringBeatsListing', (kbnUrl) => {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      pageIndex: '=',
      filterText: '=',
      sortKey: '=',
      sortOrder: '=',
      onNewState: '=',
    },
    link(scope, $el) {

      scope.$watch('data', (data = {}) => {
        render((
          <div>
            <Stats stats={data.stats} />
            <div className="page-row">
              <MonitoringTable
                className="beatsTable"
                rows={data.listing}
                pageIndex={scope.pageIndex}
                filterText={scope.filterText}
                sortKey={scope.sortKey}
                sortOrder={scope.sortOrder}
                onNewState={scope.onNewState}
                placeholder="Filter Beats..."
                filterFields={filterFields}
                columns={columns}
                rowComponent={beatRowFactory(scope, kbnUrl)}
              />
            </div>
          </div>
        ), $el[0]);
      });

    }
  };
});
