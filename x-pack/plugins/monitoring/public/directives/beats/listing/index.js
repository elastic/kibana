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
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
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
  {
    title: i18n.translate('xpack.monitoring.beats.instances.nameTitle', { defaultMessage: 'Name' }),
    sortKey: 'name',
    sortOrder: SORT_ASCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.beats.instances.typeTitle', { defaultMessage: 'Type' }),
    sortKey: 'type'
  },
  {
    title: i18n.translate('xpack.monitoring.beats.instances.outputEnabledTitle', { defaultMessage: 'Output Enabled' }),
    sortKey: 'output'
  },
  {
    title: i18n.translate('xpack.monitoring.beats.instances.totalEventsRateTitle', { defaultMessage: 'Total Events Rate' }),
    sortKey: 'total_events_rate',
    secondarySortOrder: SORT_DESCENDING
  },
  {
    title: i18n.translate('xpack.monitoring.beats.instances.bytesSentRateTitle', { defaultMessage: 'Bytes Sent Rate' }),
    sortKey: 'bytes_sent_rate'
  },
  {
    title: i18n.translate('xpack.monitoring.beats.instances.outputErrorsTitle', { defaultMessage: 'Output Errors' }),
    sortKey: 'errors'
  },
  {
    title: i18n.translate('xpack.monitoring.beats.instances.allocatedMemoryTitle', { defaultMessage: 'Allocated Memory' }),
    sortKey: 'memory'
  },
  {
    title: i18n.translate('xpack.monitoring.beats.instances.versionTitle', { defaultMessage: 'Version' }),
    sortKey: 'version'
  },
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
          <div className="monTableCell__name">
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
uiModule.directive('monitoringBeatsListing', (kbnUrl, i18n) => {
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
        const filterBeatsPlaceholder = i18n('xpack.monitoring.beats.filterBeatsPlaceholder', { defaultMessage: 'Filter Beats…' });

        render((
          <I18nProvider>
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
                  placeholder={filterBeatsPlaceholder}
                  filterFields={filterFields}
                  columns={columns}
                  rowComponent={beatRowFactory(scope, kbnUrl)}
                />
              </div>
            </div>
          </I18nProvider>
        ), $el[0]);
      });

    }
  };
});
