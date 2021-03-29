/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SchemaConflicts } from '../../../shared/types';
import { EngineDetails } from '../engine/types';

import { getConflictingEnginesSet } from './utils';

const DEFAULT_META_ENGINE_DETAILS = {
  name: 'test-engine-1',
  includedEngines: [
    {
      name: 'source-engine-1',
    },
    {
      name: 'source-engine-2',
    },
    {
      name: 'source-engine-3',
    },
  ] as EngineDetails[],
  schemaConflicts: {
    'conflicting-field-1': {
      text: ['source-engine-1'],
      number: ['source-engine-2'],
      geolocation: [],
      date: [],
    },
    'conflicting-field-2': {
      text: [],
      number: [],
      geolocation: ['source-engine-2'],
      date: ['source-engine-3'],
    },
  } as SchemaConflicts,
} as EngineDetails;

describe('getConflictingEnginesSet', () => {
  it('generates a set of engine names with any field conflicts for the meta-engine', () => {
    expect(getConflictingEnginesSet(DEFAULT_META_ENGINE_DETAILS)).toEqual(
      new Set<string>(['source-engine-1', 'source-engine-2', 'source-engine-3'])
    );
  });
});
