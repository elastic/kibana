/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema, type EntityDefinition } from '@kbn/entities-schema';
import { ENTITY_STORE_DEFAULT_SOURCE_INDICES } from './constants';
import { getEntityDefinitionId } from './utils/utils';

export const buildHostEntityDefinition = (): EntityDefinition =>
  entityDefinitionSchema.parse({
    id: getEntityDefinitionId('host'),
    name: 'EA Host Store',
    type: 'host',
    indexPatterns: ENTITY_STORE_DEFAULT_SOURCE_INDICES,
    identityFields: ['host.name'],
    displayNameTemplate: '{{host.name}}',
    metadata: [
      'host.domain',
      'host.hostname',
      'host.id',
      'host.ip',
      'host.mac',
      'host.name',
      'host.type',
      'host.architecture',
    ],
    history: {
      timestampField: '@timestamp',
      interval: '1m',
    },
    version: '1.0.0',
  });

export const buildUserEntityDefinition = (): EntityDefinition =>
  entityDefinitionSchema.parse({
    id: getEntityDefinitionId('user'),
    name: 'EA User Store',
    indexPatterns: ENTITY_STORE_DEFAULT_SOURCE_INDICES,
    identityFields: ['user.name'],
    displayNameTemplate: '{{user.name}}',
    metadata: [
      'user.domain',
      'user.email',
      'user.full_name',
      'user.hash',
      'user.id',
      'user.name',
      'user.roles',
    ],
    history: {
      timestampField: '@timestamp',
      interval: '1m',
    },
    version: '1.0.0',
  });
