/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { lastValueFrom } from 'rxjs';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { ESQLSearchResponse } from '@kbn/es-types';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { LoadingPanel } from '../loading_panel';

export function DatasetOverview() {
  const {
    dependencies: {
      start: { dataViews, data },
    },
  } = useKibana();

  const {
    path: { name },
  } = useInventoryParams('/dataset/{name}/*');

  const [query, setQuery] = useState(`FROM "${name}" | LIMIT 100`);

  const dataViewAsync = useAbortableAsync(() => {
    return getESQLAdHocDataview(query, dataViews);
  }, [query, dataViews]);

  const { value: datatable } = useAbortableAsync(
    async ({ signal }) => {
      return await lastValueFrom(
        data.search.search(
          {
            params: {
              query,
              dropNullColumns: true,
            },
          },
          { strategy: ESQL_SEARCH_STRATEGY, abortSignal: signal }
        )
      ).then((searchResponse) => {
        const esqlResponse = searchResponse.rawResponse as unknown as ESQLSearchResponse;

        const columns =
          esqlResponse.columns?.map(({ name: columnName, type }) => ({
            id: columnName,
            name: columnName,
            meta: { type: esFieldTypeToKibanaFieldType(type) as DatatableColumnType },
          })) ?? [];

        return {
          columns,
          rows: esqlResponse.values,
        };
      });
    },
    [query, data.search]
  );

  const initialColumns = useMemo(() => {
    if (!datatable) {
      return [];
    }

    const timestampColumnIndex = datatable.columns.findIndex(
      (column) => column.name === '@timestamp'
    );
    const messageColumnIndex = datatable.columns.findIndex((column) => column.name === 'message');

    if (datatable.columns.length > 20 && timestampColumnIndex !== -1 && messageColumnIndex !== -1) {
      const hasDataForBothColumns = datatable.rows.every((row) => {
        const timestampValue = row[timestampColumnIndex];
        const messageValue = row[messageColumnIndex];

        return timestampValue !== null && timestampValue !== undefined && !!messageValue;
      });

      if (hasDataForBothColumns) {
        return [datatable.columns[timestampColumnIndex], datatable.columns[messageColumnIndex]];
      }
    }
    return datatable.columns;
  }, [datatable]);

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
      isTableView={false}
      initialRowHeight={0}
    />
  );
}
