/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Entity, IdentityField } from '../entities';

export function getEntitySourceDslFilter({
  entity,
  identityFields,
}: {
  entity: Entity;
  identityFields: IdentityField[];
}): QueryDslQueryContainer[] {
  return [
    {
      bool: {
        filter: [
          ...identityFields.flatMap(({ field, optional }): QueryDslQueryContainer[] => {
            const value = entity.properties[field];

            if (value === null || value === undefined || value === '') {
              return optional ? [{ bool: { must_not: { exists: { field } } } }] : [];
            }
            return [
              {
                term: {
                  [field]: value,
                },
              },
            ];
          }),
        ],
      },
    },
  ];
}
