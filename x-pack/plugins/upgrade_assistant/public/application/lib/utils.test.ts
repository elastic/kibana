/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEPRECATION_WARNING_UPPER_LIMIT } from '../../../common/constants';
import { getDeprecationsUpperLimit, getReindexProgressLabel, validateRegExpString } from './utils';
import { ReindexStep } from '../../../common/types';

describe('validRegExpString', () => {
  it('correctly returns false for invalid strings', () => {
    expect(validateRegExpString('?asd')).toContain(`Invalid regular expression`);
    expect(validateRegExpString('*asd')).toContain(`Invalid regular expression`);
    expect(validateRegExpString('(')).toContain(`Invalid regular expression`);
  });

  it('correctly returns true for valid strings', () => {
    expect(validateRegExpString('asd')).toBe('');
    expect(validateRegExpString('.*asd')).toBe('');
    expect(validateRegExpString('')).toBe('');
  });
});

describe('getDeprecationsUpperLimit', () => {
  it('correctly returns capped number if it goes above limit', () => {
    expect(getDeprecationsUpperLimit(1000000)).toBe(`${DEPRECATION_WARNING_UPPER_LIMIT}+`);
    expect(getDeprecationsUpperLimit(2000000)).toBe(`${DEPRECATION_WARNING_UPPER_LIMIT}+`);
  });

  it('correctly returns true for valid strings', () => {
    expect(getDeprecationsUpperLimit(10)).toBe('10');
    expect(getDeprecationsUpperLimit(DEPRECATION_WARNING_UPPER_LIMIT)).toBe(
      DEPRECATION_WARNING_UPPER_LIMIT.toString()
    );
  });
});

describe('getReindexProgressLabel', () => {
  it('returns 0% when the reindex task has just been created', () => {
    expect(getReindexProgressLabel(null, ReindexStep.created)).toBe('0%');
  });

  it('returns 5% when the index has been made read-only', () => {
    expect(getReindexProgressLabel(null, ReindexStep.readonly)).toBe('5%');
  });

  it('returns 10% when the reindexing documents has started, but the progress is null', () => {
    expect(getReindexProgressLabel(null, ReindexStep.reindexStarted)).toBe('10%');
  });

  it('returns 10% when the reindexing documents has started, but the progress is 0', () => {
    expect(getReindexProgressLabel(0, ReindexStep.reindexStarted)).toBe('10%');
  });

  it('returns 50% when the reindexing documents progress is 0.5', () => {
    expect(getReindexProgressLabel(0.5, ReindexStep.reindexStarted)).toBe('50%');
  });

  it('returns 90% when the reindexing documents progress is 1', () => {
    expect(getReindexProgressLabel(1, ReindexStep.reindexStarted)).toBe('90%');
  });

  it('returns 95% when alias has been created', () => {
    expect(getReindexProgressLabel(null, ReindexStep.aliasCreated)).toBe('95%');
  });

  it('returns 100% when original index has been deleted', () => {
    expect(getReindexProgressLabel(null, ReindexStep.originalIndexDeleted)).toBe('100%');
  });

  describe('when there are existing aliases', () => {
    const withExistingAliases = true;

    it('returns 48% when the reindexing documents progress is 0.5', () => {
      expect(getReindexProgressLabel(0.5, ReindexStep.reindexStarted, withExistingAliases)).toBe(
        '48%'
      );
    });

    it('returns 85% when the reindexing documents progress is 1', () => {
      expect(getReindexProgressLabel(1, ReindexStep.reindexStarted, withExistingAliases)).toBe(
        '85%'
      );
    });

    it('returns 90% when alias has been created', () => {
      expect(getReindexProgressLabel(null, ReindexStep.aliasCreated, withExistingAliases)).toBe(
        '90%'
      );
    });

    it('returns 95% when original index has been deleted', () => {
      expect(
        getReindexProgressLabel(null, ReindexStep.originalIndexDeleted, withExistingAliases)
      ).toBe('95%');
    });

    it('returns 100% when original index has been deleted', () => {
      expect(
        getReindexProgressLabel(null, ReindexStep.existingAliasesUpdated, withExistingAliases)
      ).toBe('100%');
    });
  });
});
