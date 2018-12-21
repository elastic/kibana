/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { EuiPage, EuiLink, EuiPageBody, EuiPageContent, EuiSpacer } from '@elastic/eui';
import { formatPercentageUsage, formatNumber } from '../../../lib/format_number';
import { ClusterStatus } from '..//cluster_status';
import { EuiMonitoringTable } from '../../table';
import { injectI18n } from '@kbn/i18n/react';

class ListingUI extends PureComponent {
  getColumns() {
    const { kbnUrl, scope } = this.props.angular;

    return [
      {
        name: 'Name',
        field: 'name',
        sortable: true,
        render: (name, node) => (
          <div>
            <div>
              <EuiLink
                onClick={() => {
                  scope.$evalAsync(() => {
                    kbnUrl.changePath(`/logstash/node/${node.logstash.uuid}`);
                  });
                }}
              >
                {name}
              </EuiLink>
            </div>
            <div>
              {node.logstash.http_address}
            </div>
          </div>
        )
      },
      {
        name: 'CPU Usage',
        field: 'cpu_usage',
        sortable: true,
        render: value => formatPercentageUsage(value, 100)
      },
      {
        name: 'Load Average',
        field: 'load_average',
        sortable: true,
        render: value => formatNumber(value, '0.00')
      },
      {
        name: 'JVM Heap Used',
        field: 'jvm_heap_used',
        sortable: true,
        render: value => formatPercentageUsage(value, 100)
      },
      {
        name: 'Events Ingested',
        field: 'events_out',
        sortable: true,
        render: value => formatNumber(value, '0.[0]a')
      },
      {
        name: 'Config Reloads',
        sortable: true,
        render: node => (
          <div>
            <div>{ node.reloads.successes } successes</div>
            <div>{ node.reloads.failures } failures</div>
          </div>
        )
      },
      {
        name: 'Version',
        field: 'version',
        sortable: true,
        render: value => formatNumber(value)
      }
    ];
  }
  render() {
    const { data, stats, sorting, pagination, onTableChange, intl } = this.props;
    const columns = this.getColumns();
    const flattenedData = data.map(item => ({
      ...item,
      name: item.logstash.name,
      cpu_usage: item.process.cpu.percent,
      load_average: item.os.cpu.load_average['1m'],
      jvm_heap_used: item.jvm.mem.heap_used_percent,
      events_ingested: item.events.out,
      version: item.logstash.version,
    }));

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <ClusterStatus stats={stats} />
            <EuiSpacer size="m"/>
            <EuiMonitoringTable
              className="logstashNodesTable"
              rows={flattenedData}
              columns={columns}
              sorting={{
                ...sorting,
                sort: {
                  ...sorting.sort,
                  field: 'logstash.name'
                }
              }}
              pagination={pagination}
              search={{
                box: {
                  incremental: true,
                  placeholder: intl.formatMessage({
                    id: 'xpack.monitoring.logstash.filterNodesPlaceholder',
                    defaultMessage: 'Filter Nodes…'
                  })
                },
              }}
              onTableChange={onTableChange}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const Listing = injectI18n(ListingUI);
