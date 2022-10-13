/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SchemaConflictFieldTypes, SchemaConflicts } from '../../../../../shared/schema/types';
import { EngineDetails } from '../../../engine/types';

import {
  getConflictingEnginesFromConflictingField,
  getConflictingEnginesFromSchemaConflicts,
  getConflictingEnginesSet,
} from './utils';

describe('getConflictingEnginesFromConflictingField', () => {
  const CONFLICTING_FIELD: SchemaConflictFieldTypes = {
    text: ['source-engine-1'],
    number: ['source-engine-2', 'source-engine-3'],
    geolocation: ['source-engine-4'],
    date: ['source-engine-5', 'source-engine-6'],
  };

  it('returns a flat array of all engines with conflicts across different schema types, including duplicates', () => {
    const result = getConflictingEnginesFromConflictingField(CONFLICTING_FIELD);

    // we can't guarantee ordering
    expect(result).toHaveLength(6);
    expect(result).toContain('source-engine-1');
    expect(result).toContain('source-engine-2');
    expect(result).toContain('source-engine-3');
    expect(result).toContain('source-engine-4');
    expect(result).toContain('source-engine-5');
    expect(result).toContain('source-engine-6');
  });
});

describe('getConflictingEnginesFromSchemaConflicts', () => {
  it('returns a flat array of all engines with conflicts across all fields, including duplicates', () => {
    const SCHEMA_CONFLICTS: SchemaConflicts = {
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
    };

    const result = getConflictingEnginesFromSchemaConflicts(SCHEMA_CONFLICTS);

    // we can't guarantee ordering
    expect(result).toHaveLength(4);
    expect(result).toContain('source-engine-1');
    expect(result).toContain('source-engine-2');
    expect(result).toContain('source-engine-3');
  });
});

describe('getConflictingEnginesSet', () => {
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

  it('generates a set of engine names with any field conflicts for the meta-engine', () => {
    expect(getConflictingEnginesSet(DEFAULT_META_ENGINE_DETAILS)).toEqual(
      new Set<string>(['source-engine-1', 'source-engine-2', 'source-engine-3'])
    );
  });
});
