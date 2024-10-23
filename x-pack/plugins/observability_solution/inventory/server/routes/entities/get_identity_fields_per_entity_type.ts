/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryEntityLatest } from '../../../common/entities';

export type IdentityFieldsPerEntityType = Map<string, string[]>;

export const getIdentityFieldsPerEntityType = (entities: InventoryEntityLatest[]) => {
  const identityFieldsPerEntityType = new Map<string, string[]>();

  entities.forEach((entity) =>
    identityFieldsPerEntityType.set(entity.entity.type, entity.entity.identityFields)
  );

  return identityFieldsPerEntityType;
};
