/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SchemaConflicts } from '../../../shared/types';
import { EngineDetails } from '../engine/types';

import { getConflictingEnginesSet } from './utils';

describe('getConflictingEnginesSet', () => {
  const META_ENGINE_DETAILS = {
    name: 'test-engine-1',
    includedEngines: [
      {
        name: 'source-engine-1',
      },
      {
        name: 'source-engine-2',
      },
    ] as EngineDetails[],
    schemaConflicts: {
      'conflicting-field-1': {
        text: ['source-engine-1'],
        number: ['source-engine-2'],
        geolocation: [],
        date: [],
      },
    } as SchemaConflicts,
  } as EngineDetails;

  expect(getConflictingEnginesSet(META_ENGINE_DETAILS)).toEqual(
    new Set<string>(['source-engine-1', 'source-engine-2'])
  );
});
