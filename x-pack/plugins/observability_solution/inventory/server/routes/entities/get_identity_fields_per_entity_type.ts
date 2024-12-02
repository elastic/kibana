/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { InventoryEntity } from '../../../common/entities';

export type IdentityFieldsPerEntityType = Map<string, string[]>;

export const getIdentityFieldsPerEntityType = (latestEntities: InventoryEntity[]) => {
  const identityFieldsPerEntityType = new Map<string, string[]>();

  latestEntities.forEach((entity) =>
    identityFieldsPerEntityType.set(entity.entityType, castArray(entity.entityIdentityFields))
  );

  return identityFieldsPerEntityType;
};
