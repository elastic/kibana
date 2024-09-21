/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { set } from '@kbn/safer-lodash-set';
import { castArray } from 'lodash';
import { parse, render } from 'mustache';
import type { Logger } from '@kbn/logging';
import type { Entity, EntityDefinition } from '../../../common/entities';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';

export async function getEntitiesFromSource({
  esClient,
  dslFilter,
  indexPatterns,
  definition,
  start,
  end,
  kuery,
  logger,
}: {
  esClient: ObservabilityElasticsearchClient;
  dslFilter?: QueryDslQueryContainer[];
  indexPatterns: string[];
  definition: EntityDefinition;
  start: number;
  end: number;
  kuery: string;
  logger: Logger;
}): Promise<Array<Pick<Entity, 'type' | 'displayName'>>> {
  const allFields = definition.identityFields;

  const requiredFields =
    allFields.filter(({ optional }) => !optional).map(({ field }) => field) ?? [];

  // we need to figure out which indices we can and cannot query due to
  // mapping conflicts and ES|QL throwing an error
  const columnVerificationResponse = await esClient
    .fieldCaps('get_entities_source_columns', {
      index: indexPatterns,
      fields: allFields.map(({ field }) => field),
      index_filter: {
        // cast a wide net until https://github.com/elastic/elasticsearch/issues/113093 is fixed
        match_all: {},
      },
    })
    .then((response) => {
      return Object.entries(response.fields).map(([field, fieldSpec]) => {
        const types = Object.keys(fieldSpec);

        const include = new Set<string>();
        const exclude = new Set<string>();

        types.forEach((type) => {
          if (type === 'object') {
            return;
          }
          const specForType = fieldSpec[type];
          const indices = castArray(specForType.indices ?? []);

          indices.forEach((index) => {
            if (type === 'keyword') {
              include.add(index);
            } else {
              exclude.add(index);
            }
          });
        });

        return {
          field,
          include,
          exclude,
        };
      });
    });

  const excludeIndices = Array.from(
    new Set(
      columnVerificationResponse.flatMap((fieldResult) => Array.from(fieldResult.exclude.values()))
    )
  );

  const includeIndices = Array.from(
    new Set(
      columnVerificationResponse.flatMap((fieldResult) => Array.from(fieldResult.include.values()))
    )
  );

  const availableColumnNames = new Set(columnVerificationResponse.map((column) => column.field));

  const excludePatternsIncludeFrozen = excludeIndices.some((index) => index.includes('partial-'));

  const excludePatterns = excludeIndices.map((index) => {
    if (index.includes(':')) {
      return index.replace(/:/, ':-');
    }
    return `-${index}`;
  });

  const patterns = excludePatternsIncludeFrozen
    ? includeIndices
    : indexPatterns.concat(excludePatterns);

  const baseQuery = `FROM ${patterns.join(', ')} METADATA _index`;

  const withRequiredFieldsFilter = [
    ...(dslFilter ?? []),
    ...(requiredFields.length
      ? [
          {
            bool: {
              filter: requiredFields.map((field) => ({ exists: { field } })),
            },
          },
        ]
      : []),
  ];
  const hasAllRequiredIdentityFields = definition.identityFields.every(
    ({ field, optional }) => optional || availableColumnNames.has(field)
  );

  if (!hasAllRequiredIdentityFields) {
    // this set of indices cannot have data for this entity type
    // because some required fields are missing
    return [];
  }

  const groupingFields = definition.identityFields
    .filter(({ field }) => availableColumnNames.has(field))
    .map(({ field }) => field);

  const entitiesFromSourceQuery =
    baseQuery +
    ` | STATS _index = VALUES(_index) BY ${groupingFields
      .map((field) => `${field} = TO_STRING(${field})`)
      .join(',')}`;

  console.log(JSON.stringify(withRequiredFieldsFilter));

  const searchSourceRequest = getEsqlRequest({
    query: entitiesFromSourceQuery,
    start,
    end,
    kuery,
    dslFilter: withRequiredFieldsFilter,
  });

  const sourceResponse = await esClient
    .esql('get_entities_from_source', searchSourceRequest)
    .catch((error) => {
      logger.warn(`Failed to fetch entities for type ${definition.type}`);
      logger.debug(() => error);
      return undefined;
    });

  if (!sourceResponse) {
    return [];
  }

  const entities = sourceResponse.values.map((values) => {
    return values.reduce<Record<string, any>>((acc, value, index) => {
      const column = sourceResponse.columns[index];
      if (column.name === '_index') {
        value = castArray(value)[0];
      }
      set(acc, column.name, value);
      return acc;
    }, {});
  });

  const tpl = definition.displayNameTemplate!;
  parse(tpl);

  return entities.map((foundEntity) => {
    const index = foundEntity._index ?? '';
    const remote = index.includes(':') ? index.split(':')[0] + ':' : '';

    const displayName = render(tpl, { ...foundEntity, remote });

    return {
      type: definition.type,
      displayName,
    };
  });
}
