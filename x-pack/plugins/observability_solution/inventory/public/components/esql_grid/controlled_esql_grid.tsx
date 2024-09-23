/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import {
  AbortableAsyncState,
  useAbortableAsync,
} from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { EuiCallOut } from '@elastic/eui';
import { ESQLSearchResponse } from '@kbn/es-types';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { LoadingPanel } from '../loading_panel';
import { useKibana } from '../../hooks/use_kibana';

export function ControlledEsqlGrid({
  query,
  result,
  initialColumns,
  analysisId,
}: {
  query: string;
  result: AbortableAsyncState<ESQLSearchResponse>;
  initialColumns?: ESQLSearchResponse['columns'];
  analysisId?: string;
}) {
  const {
    dependencies: {
      start: { dataViews },
    },
  } = useKibana();

  const response = result.value;

  const dataViewAsync = useAbortableAsync(() => {
    return getESQLAdHocDataview(query, dataViews);
  }, [query, dataViews]);

  const datatableColumns = useMemo<DatatableColumn[]>(() => {
    return (
      response?.columns.map((column): DatatableColumn => {
        return {
          id: column.name,
          meta: {
            type: 'string',
            esType: column.type,
          },
          name: column.name,
        };
      }) ?? []
    );
  }, [response?.columns]);

  const initialDatatableColumns = useMemo<DatatableColumn[] | undefined>(() => {
    if (!initialColumns) {
      return undefined;
    }

    const initialColumnNames = new Set([...initialColumns.map((column) => column.name)]);
    return datatableColumns.filter((column) => initialColumnNames.has(column.name));
  }, [datatableColumns, initialColumns]);

  if (!dataViewAsync.value || !response) {
    return <LoadingPanel loading={dataViewAsync.loading} />;
  }

  if (!result.loading && !result.error && !response.values.length) {
    return (
      <EuiCallOut>
        {i18n.translate('xpack.inventory.controlledEsqlGrid.noResultsCallOutLabel', {
          defaultMessage: 'No results',
        })}
      </EuiCallOut>
    );
  }

  return (
    <ESQLDataGrid
      key={analysisId}
      rows={response.values}
      columns={datatableColumns}
      initialColumns={initialDatatableColumns}
      dataView={dataViewAsync.value}
      query={{ esql: query }}
      flyoutType="overlay"
      isTableView
      initialRowHeight={1}
    />
  );
}
