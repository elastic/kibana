/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiIcon } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ValuesType } from 'utility-types';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';

export type ApmDataServiceItem = ValuesType<
  APIReturnType<'GET /internal/apm/diagnostics/services_summary'>['services']
>;

export function getServicesColumns(): Array<ITableColumn<ApmDataServiceItem>> {
  return [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.apm.diagnostics.serviceList.name.columnName',
        {
          defaultMessage: 'Service Name',
        }
      ),
      sortable: true,
      width: '35%',
      truncateText: true,
      render: (_, { name }) => (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListServiceLink"
          text={name}
          content={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem className="eui-textTruncate">
                <span className="eui-textTruncate">{name}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      ),
    },
    {
      field: 'transactions',
      width: '15%',
      name: i18n.translate(
        'xpack.apm.diagnostics.serviceList.transactions.columnName',
        { defaultMessage: 'Transactions' }
      ),
      sortable: true,
      align: 'center',
      render: (_, { transactions }) =>
        transactions ?? (
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.apm.diagnostics.serviceList.transactions.tooltip.content',
              { defaultMessage: 'No transactions found' }
            )}
          >
            <EuiIcon
              tabIndex={0}
              type="alert"
              title={i18n.translate(
                'xpack.apm.diagnostics.serviceList.transactions.tooltip',
                { defaultMessage: 'No transactions tooltip' }
              )}
            />
          </EuiToolTip>
        ),
    },
    {
      field: 'spans',
      width: '15%',
      name: i18n.translate(
        'xpack.apm.diagnostics.serviceList.spans.columnName',
        { defaultMessage: 'Spans' }
      ),
      sortable: true,
      align: 'center',
      render: (_, { spans }) =>
        spans ?? (
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.apm.diagnostics.serviceList.spans.tooltip.content',
              { defaultMessage: 'No spans found' }
            )}
          >
            <EuiIcon
              tabIndex={0}
              type="alert"
              title={i18n.translate(
                'xpack.apm.diagnostics.serviceList.spans.tooltip',
                { defaultMessage: 'No spans tooltip' }
              )}
            />
          </EuiToolTip>
        ),
    },
    {
      field: 'metrics',
      width: '15%',
      name: i18n.translate(
        'xpack.apm.diagnostics.serviceList.metrics.columnName',
        { defaultMessage: 'Metrics' }
      ),
      sortable: true,
      align: 'center',
      render: (_, { metrics }) =>
        metrics ?? (
          <EuiToolTip
            position="top"
            content={i18n.translate(
              'xpack.apm.diagnostics.serviceList.metrics.tooltip.content',
              { defaultMessage: 'No metrics found' }
            )}
          >
            <EuiIcon
              tabIndex={0}
              type="alert"
              title={i18n.translate(
                'xpack.apm.diagnostics.serviceList.metrics.tooltip',
                { defaultMessage: 'No metrics tooltip' }
              )}
            />
          </EuiToolTip>
        ),
    },
  ];
}

interface Props {
  items: ApmDataServiceItem[];
}

export function DiagnosticsServicesList({ items }: Props) {
  const agentColumns = useMemo(() => getServicesColumns(), []);

  return (
    <>
      <ManagedTable
        columns={agentColumns}
        items={items}
        initialSortField="name"
        initialSortDirection="desc"
        initialPageSize={25}
      />
    </>
  );
}
