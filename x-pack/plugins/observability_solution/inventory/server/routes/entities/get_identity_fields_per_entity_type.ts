/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_IDENTITY_FIELDS, ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { Entity } from '../../../common/entities';

export type IdentityFieldsPerEntityType = Map<string, string[]>;

export const getIdentityFieldsPerEntityType = (entities: Entity[]) => {
  const identityFieldsPerEntityType: IdentityFieldsPerEntityType = new Map();

  entities.forEach((entity) =>
    identityFieldsPerEntityType.set(entity[ENTITY_TYPE], [entity[ENTITY_IDENTITY_FIELDS]].flat())
  );

  return identityFieldsPerEntityType;
};
