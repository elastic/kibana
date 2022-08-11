/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hasEqlSequenceQuery,
  hasNestedEntry,
  isThreatMatchRule,
  normalizeMachineLearningJobIds,
  normalizeThresholdField,
  isMlRule,
} from './utils';

import { hasLargeValueList } from '@kbn/securitysolution-list-utils';

import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';

describe('#hasLargeValueList', () => {
  test('it returns false if empty array', () => {
    const hasLists = hasLargeValueList([]);

    expect(hasLists).toBeFalsy();
  });

  test('it returns true if item of type EntryList exists', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'list',
        operator: 'included',
        list: { id: 'some id', type: 'ip' },
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasLargeValueList(entries);

    expect(hasLists).toBeTruthy();
  });

  test('it returns false if item of type EntryList does not exist', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasLargeValueList(entries);

    expect(hasLists).toBeFalsy();
  });
});

describe('#hasNestedEntry', () => {
  test('it returns false if empty array', () => {
    const hasLists = hasNestedEntry([]);

    expect(hasLists).toBeFalsy();
  });

  test('it returns true if item of type EntryNested exists', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'nested',
        entries: [
          { field: 'some field', type: 'match', operator: 'included', value: 'some value' },
        ],
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasNestedEntry(entries);

    expect(hasLists).toBeTruthy();
  });

  test('it returns false if item of type EntryNested does not exist', () => {
    const entries: EntriesArray = [
      {
        field: 'actingProcess.file.signer',
        type: 'match',
        operator: 'included',
        value: 'Elastic, N.V.',
      },
      {
        field: 'file.signature.signer',
        type: 'match',
        operator: 'excluded',
        value: 'Global Signer',
      },
    ];
    const hasLists = hasNestedEntry(entries);

    expect(hasLists).toBeFalsy();
  });

  describe('isThreatMatchRule', () => {
    test('it returns true if a threat match rule', () => {
      expect(isThreatMatchRule('threat_match')).toEqual(true);
    });

    test('it returns false if not a threat match rule', () => {
      expect(isThreatMatchRule('query')).toEqual(false);
    });
  });
});

describe('isMlRule', () => {
  test('it returns true if a ML rule', () => {
    expect(isMlRule('machine_learning')).toEqual(true);
  });

  test('it returns false if not a Ml rule', () => {
    expect(isMlRule('query')).toEqual(false);
  });
});

describe('#hasEqlSequenceQuery', () => {
  describe('when a non-sequence query is passed', () => {
    const query = 'process where process.name == "regsvr32.exe"';
    it('should return false', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(false);
    });
  });

  describe('when a sequence query is passed', () => {
    const query = 'sequence [process where process.name = "test.exe"]';
    it('should return true', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(true);
    });
  });

  describe('when a sequence query is passed with extra white space and escape characters', () => {
    const query = '\tsequence  \n [process    where   process.name = "test.exe"]';
    it('should return true', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(true);
    });
  });

  describe('when a non-sequence query is passed using the word sequence', () => {
    const query = 'sequence where true';
    it('should return false', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(false);
    });
  });

  describe('when a non-sequence query is passed using the word sequence with extra white space and escape characters', () => {
    const query = '  sequence\nwhere\ttrue';
    it('should return false', () => {
      expect(hasEqlSequenceQuery(query)).toEqual(false);
    });
  });
});

describe('normalizeThresholdField', () => {
  it('converts a string to a string array', () => {
    expect(normalizeThresholdField('host.name')).toEqual(['host.name']);
  });
  it('returns a string array when a string array is passed in', () => {
    expect(normalizeThresholdField(['host.name'])).toEqual(['host.name']);
  });
  it('converts undefined to an empty array', () => {
    expect(normalizeThresholdField(undefined)).toEqual([]);
  });
  it('converts null to an empty array', () => {
    expect(normalizeThresholdField(null)).toEqual([]);
  });
  it('converts an empty string to an empty array', () => {
    expect(normalizeThresholdField('')).toEqual([]);
  });
});

describe('normalizeMachineLearningJobIds', () => {
  it('converts a string to a string array', () => {
    expect(normalizeMachineLearningJobIds('ml_job_id')).toEqual(['ml_job_id']);
  });

  it('preserves a single-valued array ', () => {
    expect(normalizeMachineLearningJobIds(['ml_job_id'])).toEqual(['ml_job_id']);
  });

  it('preserves a multi-valued array ', () => {
    expect(normalizeMachineLearningJobIds(['ml_job_id', 'other_ml_job_id'])).toEqual([
      'ml_job_id',
      'other_ml_job_id',
    ]);
  });
});
