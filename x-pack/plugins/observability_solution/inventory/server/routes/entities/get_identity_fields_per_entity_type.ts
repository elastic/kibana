/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Entity, EntityType } from '../../../common/entities';
import { ENTITY_IDENTITY_FIELDS, ENTITY_TYPE } from '../../../common/es_fields/entities';

export type IdentityFieldsPerEntityType = Map<EntityType, string[]>;

export const getIdentityFieldsPerEntityType = (
  entities: Array<Pick<Entity, typeof ENTITY_TYPE | typeof ENTITY_IDENTITY_FIELDS>>
) => {
  const identityFieldsPerEntityType: IdentityFieldsPerEntityType = new Map();

  entities.map((entity) =>
    identityFieldsPerEntityType.set(
      entity[ENTITY_TYPE],
      Array.isArray(entity[ENTITY_IDENTITY_FIELDS])
        ? entity[ENTITY_IDENTITY_FIELDS]
        : [entity[ENTITY_IDENTITY_FIELDS]]
    )
  );

  return identityFieldsPerEntityType;
};
