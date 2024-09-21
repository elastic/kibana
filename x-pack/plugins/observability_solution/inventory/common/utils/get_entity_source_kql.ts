/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Entity, IdentityField } from '../entities';

export function getEntitySourceKql({
  entity,
  identityFields,
}: {
  entity: Entity;
  identityFields: IdentityField[];
}): string {
  const query =
    identityFields
      .map((identityField) => {
        const value = entity.properties[identityField.field];
        if (!value) {
          return `(NOT ${identityField.field}:*)`;
        }
        return `(${identityField.field}:${value})`;
      })
      .join(' AND ') ?? '';

  return query;
}
