/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { EsqlQueryResult } from '../../hooks/use_esql_query_result';
import { LoadingPanel } from '../loading_panel';
import { useKibana } from '../../hooks/use_kibana';

export function ControlledEsqlGrid({
  query,
  result,
  initialColumns,
}: {
  query: string;
  result: EsqlQueryResult;
  initialColumns?: DatatableColumn[];
}) {
  const {
    dependencies: {
      start: { dataViews },
    },
  } = useKibana();

  const datatable = result.value;

  const dataViewAsync = useAbortableAsync(() => {
    return getESQLAdHocDataview(query, dataViews);
  }, [query, dataViews]);

  if (!dataViewAsync.value || !datatable) {
    return <LoadingPanel loading={dataViewAsync.loading} />;
  }

  return (
    <ESQLDataGrid
      rows={datatable.rows}
      columns={datatable.columns}
      initialColumns={initialColumns}
      dataView={dataViewAsync.value}
      query={{ esql: query }}
      flyoutType="overlay"
      isTableView
      initialRowHeight={0}
    />
  );
}
