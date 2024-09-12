/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import React, { useMemo, useState } from 'react';
import { useEsqlQueryResult } from '../../hooks/use_esql_query_result';
import { useKibana } from '../../hooks/use_kibana';
import { ControlledEntityTable } from './controlled_entity_table';

export function EntityTable({
  type,
  dslFilter,
}: {
  type: 'all' | string;
  dslFilter?: QueryDslQueryContainer[];
}) {
  const {
    dependencies: {
      start: { dataViews },
    },
  } = useKibana();

  const query = useMemo(() => {
    const commands = ['FROM entities-*-latest'];

    if (type !== 'all') {
      commands.push(`WHERE entity.type == "${type}"`);
    }

    commands.push('SORT entity.displayName ASC');

    return commands.join(' | ');
  }, [type]);

  const [displayedKqlFilter, setDisplayedKqlFilter] = useState('');
  const [persistedKqlFilter, setPersistedKqlFilter] = useState('');

  const queryResult = useEsqlQueryResult({
    query,
    kqlFilter: persistedKqlFilter,
    dslFilter,
  });

  const entityRows = useMemo(() => {
    const columns = queryResult.value?.columns ?? [];
    const rows = queryResult.value?.rows ?? [];

    if (!columns.length || !rows.length) {
      return [];
    }

    return rows
      .map((row) => {
        return row.reduce<Record<string, unknown>>((acc, value, index) => {
          const column = columns[index];
          acc[column.name] = value;
          return acc;
        }, {});
      })
      .map((record) => {
        return {
          id: record['entity.displayName'] as string,
          type: record['entity.type'] as string,
          name: record['entity.displayName'] as string,
        };
      });
  }, [queryResult.value]);

  const [pagination, setPagination] = useState<{ pageSize: number; pageIndex: number }>({
    pageSize: 10,
    pageIndex: 0,
  });

  const dataViewsFetch = useAbortableAsync(() => {
    return dataViews
      .create(
        {
          title: `entities-*-latest`,
          timeFieldName: '@timestamp',
        },
        false, // skip fetch fields
        true // display errors
      )
      .then((response) => {
        return [response];
      });
  }, [dataViews]);

  return (
    <ControlledEntityTable
      rows={entityRows}
      loading={queryResult.loading}
      kqlFilter={displayedKqlFilter}
      onKqlFilterChange={(next) => {
        setDisplayedKqlFilter(next);
      }}
      onKqlFilterSubmit={() => {
        setPersistedKqlFilter(displayedKqlFilter);
      }}
      onPaginationChange={(next) => {
        setPagination(next);
      }}
      pagination={pagination}
      totalItemCount={entityRows.length}
      columns={[]}
      dataViews={dataViewsFetch.value}
    />
  );
}
