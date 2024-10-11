/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isDefinitionEntity, isPivotEntity, type IEntity } from '../entities';

export function entitySourceQuery({ entity }: { entity: IEntity }): QueryDslQueryContainer[] {
  if (isPivotEntity(entity)) {
    return Object.entries(entity.identity).map(([field, value]) => {
      return {
        term: {
          [field]: value,
        },
      };
    });
  } else if (isDefinitionEntity(entity)) {
    return entity.filters
      .flatMap((filter): QueryDslQueryContainer => {
        if ('index' in filter) {
          return {
            bool: {
              should: filter.index.map((index) => ({ wildcard: { _index: index } })),
              minimum_should_match: 1,
            },
          };
        }
        return filter;
      })
      .concat(entity.pivot.identityFields.map((field) => ({ exists: { field } })));
  }

  throw new Error(`Could not build query for unknown entity type`);
}
