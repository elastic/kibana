/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { isEmpty, omit, partition, pickBy, uniq } from 'lodash';
import { Logger } from '@kbn/logging';
import { EntityDataSource, EntityFilter, EntityGrouping, IEntity } from '../../../common/entities';
import { escapeColumn } from '../../../common/utils/esql_escape';
import { esqlResultToPlainObjects } from '../../../common/utils/esql_result_to_plain_objects';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';
import { getEsqlIdentityCommands } from '../../routes/entities/get_esql_identity_commands';
import { EntityLookupTable } from './entity_lookup_table';

interface EntityColumnMap {
  [columnName: string]:
    | {
        expression: string;
      }
    | {
        metadata: {};
      };
}

const MAX_NUMBER_OF_ENTITIES = 500;

function getFieldsFromFilters(filters: EntityFilter[]) {
  return filters.flatMap((filter) => {
    if ('term' in filter) {
      return [Object.keys(filter.term)[0]];
    }
    return [];
  });
}

function getLookupCommands(table: EntityLookupTable<string>) {
  const entityIdAlias = `${table.name}.entity.id`;

  const joinKeys = table.joins.map((joinField) => {
    if (joinField === 'entity.id') {
      return entityIdAlias;
    }
    return joinField;
  });

  return [
    `EVAL ${escapeColumn(entityIdAlias)} = entity.id`,
    `LOOKUP ${table.name} ON ${joinKeys.map((key) => escapeColumn(key)).join(', ')}`,
    `EVAL entity.id = CASE(
      entity.id IS NULL, ${escapeColumn(entityIdAlias)},
      ${escapeColumn(entityIdAlias)} IS NOT NULL, MV_APPEND(entity.id, ${escapeColumn(
      entityIdAlias
    )}),
      NULL
    )`,
  ];
}

export async function querySourcesAsEntities<
  TEntityColumnMap extends EntityColumnMap | undefined = undefined,
  TLookupColumnName extends string = never
>({
  esClient,
  logger,
  sources,
  groupings,
  columns,
  rangeQuery,
  filters,
  postFilter,
  sortField = 'entity.displayName',
  sortOrder = 'asc',
  size = MAX_NUMBER_OF_ENTITIES,
  tables,
}: {
  esClient: ObservabilityElasticsearchClient;
  logger: Logger;
  sources: EntityDataSource[];
  groupings: EntityGrouping[];
  columns?: TEntityColumnMap;
  rangeQuery: QueryDslQueryContainer;
  filters?: QueryDslQueryContainer[];
  postFilter?: string;
  sortField?:
    | Exclude<TLookupColumnName, 'entity.id'>
    | (keyof TEntityColumnMap & string)
    | 'entity.type'
    | 'entity.displayName';
  sortOrder?: 'asc' | 'desc';
  size?: number;
  tables?: Array<EntityLookupTable<TLookupColumnName>>;
}): Promise<
  Array<
    IEntity & {
      columns: Record<
        Exclude<TLookupColumnName, 'entity.id'> | (keyof TEntityColumnMap & string),
        unknown
      >;
    }
  >
> {
  const indexPatterns = sources.flatMap((source) => source.index);

  const commands = [`FROM ${indexPatterns.join(',')} METADATA _index`];

  const [lookupBeforeTables, lookupAfterTables] = partition(
    tables,
    (table) => !table.joins.includes('entity.id')
  );

  lookupBeforeTables.forEach((table) => {
    commands.push(...getLookupCommands(table));
  });

  const allGroupingFields = uniq(groupings.flatMap((grouping) => grouping.pivot.identityFields));

  const fieldsToFilterOn = uniq(
    groupings.flatMap((grouping) => getFieldsFromFilters(grouping.filters))
  );

  const fieldCapsResponse = await esClient.fieldCaps(
    'check_column_availability_for_source_indices',
    {
      fields: [...allGroupingFields, ...fieldsToFilterOn],
      index: indexPatterns,
      index_filter: {
        bool: {
          filter: [rangeQuery],
        },
      },
    }
  );

  const [validGroupings, invalidGroupings] = partition(groupings, (grouping) => {
    const allFields = grouping.pivot.identityFields.concat(getFieldsFromFilters(grouping.filters));

    return allFields.every((field) => !isEmpty(fieldCapsResponse.fields[field]));
  });

  if (invalidGroupings.length) {
    logger.debug(
      `Some groups were not applicable because not all fields are available: ${invalidGroupings
        .map((grouping) => grouping.id)
        .join(', ')}`
    );
  }

  if (!validGroupings.length) {
    logger.debug(`No valid groupings were applicable, returning no results`);
    return [];
  }

  const groupColumns = uniq([
    ...validGroupings.flatMap(({ pivot }) => pivot.identityFields),
    ...lookupAfterTables.flatMap((table) => table.joins),
  ]);

  const metadataColumns = {
    ...pickBy(columns, (column): column is { metadata: {} } => 'metadata' in column),
    ...Object.fromEntries(fieldsToFilterOn.map((fieldName) => [fieldName, { metadata: {} }])),
  };

  const expressionColumns = pickBy(
    columns,
    (column): column is { expression: string } => 'expression' in column
  );

  const columnStatements = Object.entries(metadataColumns)
    .map(([fieldName]) => `${escapeColumn(fieldName)} = MAX(${escapeColumn(fieldName)})`)
    .concat(
      Object.entries(expressionColumns).map(
        ([fieldName, { expression }]) => `${escapeColumn(fieldName)} = ${expression}`
      )
    );

  const shouldPreAggregate = validGroupings.length > 1 && !isEmpty(expressionColumns);

  if (shouldPreAggregate) {
    commands.push(`STATS ${columnStatements.join(', ')} BY ${groupColumns.join(', ')}`);
  }

  const { beforeStatsBy, afterStatsBy } = getEsqlIdentityCommands(
    groupings,
    lookupBeforeTables.length > 0
  );

  commands.push(...beforeStatsBy);

  const columnsInFinalStatsBy = columnStatements.concat(
    groupColumns.map((column) => {
      return `${escapeColumn(column)} = MAX(${escapeColumn(column)})`;
    })
  );

  commands.push(`STATS ${columnsInFinalStatsBy.join(', ')} BY entity.id`);

  commands.push(...afterStatsBy);

  lookupAfterTables.forEach((table) => {
    commands.push(...getLookupCommands(table));
  });

  if (postFilter) {
    commands.push(postFilter);
  }

  const sortOrderUC = sortOrder.toUpperCase();

  commands.push(`SORT \`${sortField}\` ${sortOrderUC} NULLS LAST`);

  commands.push(`LIMIT ${size}`);

  const request = {
    ...getEsqlRequest({
      query: commands.join('\n| '),
      dslFilter: [rangeQuery, ...(filters ?? [])],
    }),
    ...(tables?.length
      ? {
          tables: Object.fromEntries(
            tables.map((table) => {
              const entityIdColumn = table.columns['entity.id'];
              return [
                table.name,
                {
                  ...omit(table.columns, 'entity.id'),
                  [`${table.name}.entity.id`]: entityIdColumn,
                },
              ];
            })
          ),
        }
      : {}),
  };

  const response = await esClient.esql('search_source_indices_for_entities', request);

  return esqlResultToPlainObjects(response).map((row) => {
    const columnValues = omit(row, 'entity.id', 'entity.displayName', 'entity.type');

    return {
      id: row['entity.id'],
      type: row['entity.type'],
      displayName: row['entity.displayName'],
      columns: columnValues as Record<TLookupColumnName | keyof TEntityColumnMap, unknown>,
    };
  });
}
