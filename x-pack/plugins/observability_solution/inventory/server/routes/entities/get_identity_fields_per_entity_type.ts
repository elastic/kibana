/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { EntityV2 } from '@kbn/entities-schema';

export type IdentityFieldsPerEntityType = Map<string, string[]>;

export const getIdentityFieldsPerEntityType = (latestEntities: EntityV2[]) => {
  const identityFieldsPerEntityType = new Map<string, string[]>();

  latestEntities.forEach((entity) =>
    identityFieldsPerEntityType.set(entity['entity.type'], castArray(entity.entityIdentityFields))
  );

  return identityFieldsPerEntityType;
};
