/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { set } from '@kbn/safer-lodash-set';
import { castArray } from 'lodash';
import { EntityTypeDefinition } from '../../../common/entities';
import { runEsqlQuery } from '../run_esql_query';

export async function getEntitiesFromSource({
  data,
  dslFilter,
  indexPatterns,
  definition,
  signal,
}: {
  dslFilter: QueryDslQueryContainer[];
  indexPatterns: string[];
  data: DataPublicPluginStart;
  definition: EntityTypeDefinition;
  signal: AbortSignal;
}): Promise<Array<Record<string, string | null | undefined>>> {
  const allFields = definition.discoveryDefinition?.identityFields.map(({ field }) => field) ?? [];

  const requiredFields =
    definition.discoveryDefinition?.identityFields
      .filter(({ optional }) => !optional)
      .map(({ field }) => field) ?? [];

  const query = `FROM ${indexPatterns.join(
    ', '
  )} METADATA _index | STATS _index = VALUES(_index) BY ${allFields.join(',')}`;
  const withRequiredFieldsFilter = [
    ...dslFilter,
    ...(requiredFields.length
      ? [
          {
            bool: {
              should: requiredFields.map((field) => ({ exists: { field } })),
              minimum_should_match: 1,
            },
          },
        ]
      : []),
  ];

  const result = await runEsqlQuery({
    data,
    signal,
    query,
    dslFilter: withRequiredFieldsFilter,
  });

  return result.rows.map((values) => {
    return values.reduce<Record<string, any>>((acc, value, index) => {
      const column = result.columns[index];
      if (column.name === '_index') {
        value = castArray(value)[0];
      }
      set(acc, column.name, value);
      return acc;
    }, {});
  });
}
