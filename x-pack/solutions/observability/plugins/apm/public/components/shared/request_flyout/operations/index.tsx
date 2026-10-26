/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DependencyOperation } from '@kbn/apm-api-shared';
import React, { useMemo } from 'react';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ExpandableNameCell } from '../expandable_name_cell';
import { useRequestFlyoutChild } from '../request_flyout_child';
import { useRequestFlyoutContext } from '../request_flyout_context';
import {
  getAvgTimeColumn,
  getCallRateColumn,
  getFailureRateColumn,
  getTimeConsumedColumn,
  getTypeColumn,
  getViewTracesColumn,
} from '../table_columns';
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

  const columns: Array<EuiBasicTableColumn<DependencyOperation>> = useMemo(
    () => [
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
      getTypeColumn('spanType'),
      getAvgTimeColumn('latency'),
      getCallRateColumn('throughput'),
      getFailureRateColumn('failureRate'),
      getTimeConsumedColumn('impact'),
      getViewTracesColumn({
        getRowId: ({ spanName }) => `requestFlyoutOperationActions-${spanName}`,
        getHref: ({ spanName }) =>
          getDiscoverHref({
            serviceName: sourceServiceName,
            // The same operation name can hit several resources: scope to this connection.
            dependencyName,
            spanName,
            environment,
            sortDirection: 'DESC',
          }),
      }),
    ],
    [dependencyName, isChildSelected, toggleChild, getDiscoverHref, sourceServiceName, environment]
  );

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
