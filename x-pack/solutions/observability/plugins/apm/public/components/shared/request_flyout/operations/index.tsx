/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DependencyOperation } from '@kbn/apm-api-shared';
import React from 'react';
import {
  asMillisecondDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';
import { ImpactBar } from '../../impact_bar';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ExpandableNameCell } from '../expandable_name_cell';
import { useRequestFlyoutChild } from '../request_flyout_child';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { RowActionsMenu } from '../row_actions_menu';
import { useDiscoverHrefBuilder } from '../use_discover_href_builder';
import { useTablePagination } from '../use_table_pagination';
import { useRequestFlyoutOperations } from './use_request_flyout_operations';

/**
 * Operations of the source service on the dependency of the edge (service → dependency): the exit
 * spans grouped by span name, with their type, latency, calls, failure rate and share of the time
 * consumed, all measured on the source side. The name opens the operation in a child flyout.
 */
export function RequestFlyoutOperations() {
  const {
    connection: { sourceServiceName },
    filters: { environment },
  } = useRequestFlyoutContext();
  const { toggleChild, isChildSelected } = useRequestFlyoutChild();
  const { items, dependencyName, isLoading, hasError } = useRequestFlyoutOperations();
  const { pageItems, pagination, onTableChange } = useTablePagination(items);
  const getDiscoverHref = useDiscoverHrefBuilder();

  const columns: Array<EuiBasicTableColumn<DependencyOperation>> = [
    {
      field: 'spanName',
      width: '38%',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.name', {
        defaultMessage: 'Name',
      }),
      render: (spanName: string) => {
        if (!dependencyName) {
          return spanName;
        }
        const child = { kind: 'operation' as const, spanName, dependencyName };
        return (
          <ExpandableNameCell
            data-test-subj="requestFlyoutOperationNameLink"
            ebtElement={REQUEST_FLYOUT_EBT_ELEMENTS.OPERATION_NAME}
            name={spanName}
            isExpanded={isChildSelected(child)}
            onToggle={() => toggleChild(child)}
          />
        );
      },
    },
    {
      field: 'spanType',
      width: '14%',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.type', {
        defaultMessage: 'Type',
      }),
      render: (spanType: string | undefined) =>
        spanType ? <EuiBadge color="hollow">{spanType}</EuiBadge> : '—',
    },
    {
      field: 'latency',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.avgTime', {
        defaultMessage: 'Avg time',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asMillisecondDuration(value)),
    },
    {
      field: 'throughput',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.calls', {
        defaultMessage: 'Calls',
      }),
      align: 'right' as const,
      render: (value: number) => asTransactionRate(value),
    },
    {
      field: 'failureRate',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.failed', {
        defaultMessage: 'Failed',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asPercent(value, 1)),
    },
    {
      field: 'impact',
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.timeConsumed', {
        defaultMessage: 'Time consumed',
      }),
      align: 'right' as const,
      render: (value: number) => <ImpactBar value={value} size="m" />,
    },
    {
      name: i18n.translate('xpack.apm.requestFlyout.operations.column.actions', {
        defaultMessage: 'Actions',
      }),
      align: 'right' as const,
      render: ({ spanName }: DependencyOperation) => {
        const href = getDiscoverHref({
          serviceName: sourceServiceName,
          spanName,
          environment,
          sortDirection: 'DESC',
        });
        if (!href) {
          return null;
        }
        return (
          <RowActionsMenu
            id={`requestFlyoutOperationActions-${spanName}`}
            actions={[
              {
                id: 'operationActions',
                actions: [
                  {
                    id: 'viewInDiscover',
                    name: i18n.translate(
                      'xpack.apm.requestFlyout.operations.action.viewInDiscover',
                      { defaultMessage: 'View traces in Discover' }
                    ),
                    icon: 'discoverApp',
                    href,
                    ebt: {
                      action: APM_EBT_ACTIONS.EXPLORE_TRACES,
                      element: REQUEST_FLYOUT_EBT_ELEMENTS.ROW_ACTIONS_MENU,
                    },
                  },
                ],
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <section data-test-subj="requestFlyoutSection-operations">
      <EuiBasicTable
        columns={columns}
        items={pageItems}
        loading={isLoading}
        error={
          hasError
            ? i18n.translate('xpack.apm.requestFlyout.operations.errorLabel', {
                defaultMessage: 'Unable to load the operations of this connection.',
              })
            : undefined
        }
        noItemsMessage={
          isLoading
            ? i18n.translate('xpack.apm.requestFlyout.operations.loadingLabel', {
                defaultMessage: 'Loading operations…',
              })
            : i18n.translate('xpack.apm.requestFlyout.operations.noDataLabel', {
                defaultMessage: 'No operations found for this connection.',
              })
        }
        pagination={pagination}
        onChange={onTableChange}
        rowProps={() => ({ 'data-test-subj': 'requestFlyoutOperationRow' })}
        tableCaption={i18n.translate('xpack.apm.requestFlyout.operations.tableCaption', {
          defaultMessage: 'Operations of the source service on the dependency',
        })}
        data-test-subj="requestFlyoutOperationsTable"
      />
    </section>
  );
}
