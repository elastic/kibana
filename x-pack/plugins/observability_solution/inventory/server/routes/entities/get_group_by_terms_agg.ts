/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IdentityFieldsPerEntityType } from './get_identity_fields_per_entity_type';

export const getGroupByTermsAgg = (fields: IdentityFieldsPerEntityType, maxSize = 500) => {
  return Array.from(fields).reduce((acc, [entityType, identityFields]) => {
    acc[entityType] = {
      composite: {
        size: maxSize,
        sources: identityFields.map((field) => ({
          [field]: {
            terms: {
              field,
            },
          },
        })),
      },
    };
    return acc;
  }, {} as Record<string, any>);
};
