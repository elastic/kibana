/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect } from '../definition_utils';
import type { EntityEngineInstallationDescriptor } from '../types';
import { getCommonUnitedFieldDefinitions } from './common';

export const HOST_DEFINITION_VERSION = '1.0.0';
export const HOST_IDENTITY_FIELD = 'host.name';
export const hostEntityEngineDescription: EntityEngineInstallationDescriptor = {
  entityType: 'host',
  version: HOST_DEFINITION_VERSION,
  indexPatterns: [],
  identityFields: [HOST_IDENTITY_FIELD],
  settings: {
    syncDelay: '1m',
    frequency: '1m',
    lookbackPeriod: '1d',
    timestampField: '@timestamp',
  },
  pipeline: [],
  indexMappings: {},

  fields: [
    collect({ source: 'host.domain' }),
    collect({ source: 'host.hostname' }),
    collect({ source: 'host.id' }),
    collect({
      source: 'host.os.name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'host.os.type' }),
    collect({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),
    collect({ source: 'host.mac' }),
    collect({ source: 'host.type' }),
    collect({ source: 'host.architecture' }),
    ...getCommonUnitedFieldDefinitions('host'),
  ],
};
