/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { keyBy } from 'lodash';
import React, { useMemo, useState } from 'react';
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
    services: { inventoryAPIClient },
    dependencies: {
      start: { dataViews, data },
    },
  } = useKibana();

  const {
    timeRange,
    setTimeRange,
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

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

  const [selectedType, setSelectedType] = useState(type);

  const queryFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('POST /internal/inventory/entities/inventory', {
        signal,
        params: {
          body: {
            start,
            end,
            kuery: persistedKqlFilter,
            type: selectedType,
            fromSourceIfEmpty: true,
          },
        },
      });
    },
    [inventoryAPIClient, selectedType, persistedKqlFilter, start, end]
  );

  const availableTypesFetch = useAbortableAsync(
    ({ signal }) => {
      const queryParams = {
        query,
        kuery: persistedKqlFilter,
        dslFilter: [
          ...(dslFilter ?? []),
          {
            range: {
              'entity.lastSeenTimestamp': {
                gte: start,
              },
            },
          },
          {
            range: {
              'entity.firstSeenTimestamp': {
                lte: end,
              },
            },
          },
        ],
      };

      return inventoryAPIClient
        .fetch('POST /internal/inventory/esql', {
          signal,
          params: {
            body: {
              ...queryParams,
              operationName: 'list_entity_types_for_query',
              query: queryParams.query + '| STATS BY entity.type',
            },
          },
        })
        .then((response) => {
          return response.values.map((row) => {
            return row[0] as string;
          });
        });
    },
    [inventoryAPIClient, start, end, dslFilter, persistedKqlFilter, query]
  );

  const typeDefinitionsFetch = useAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/entities/definition/inventory', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

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

  const availableTypes = useMemo(() => {
    if (!availableTypesFetch.value) {
      return undefined;
    }
    const typeDefinitionsByType = keyBy(
      typeDefinitionsFetch.value?.definitions,
      (definition) => definition.type
    );

    return [
      {
        value: 'all',
        label: i18n.translate('xpack.inventory.entityTable.allOptionLabel', {
          defaultMessage: 'All',
        }),
      },
      ...availableTypesFetch.value.map((availableType) => {
        const typeDefinition = typeDefinitionsByType[availableType];
        return typeDefinition
          ? {
              value: availableType,
              label: typeDefinition.label,
            }
          : {
              value: availableType,
              label: availableType,
            };
      }),
    ];
  }, [availableTypesFetch.value, typeDefinitionsFetch.value]);

  const entities = useMemo(() => {
    return queryFetch.value?.entities ?? [];
  }, [queryFetch.value]);

  return (
    <ControlledEntityTable
      timeRange={timeRange}
      onTimeRangeChange={(nextTimeRange) => {
        setTimeRange(nextTimeRange);
      }}
      rows={entities}
      loading={queryFetch.loading}
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
      totalItemCount={entities.length}
      columns={[]}
      dataViews={dataViewsFetch.value}
      showTypeSelect={type === 'all'}
      availableTypes={availableTypes}
      onSelectedTypeChange={(nextType) => {
        setSelectedType(nextType);
      }}
    />
  );
}
