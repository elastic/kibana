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

  it('returns 53% when the reindexing documents progress is 0.5', () => {
    expect(getReindexProgressLabel(0.5, ReindexStep.reindexStarted)).toBe('53%');
  });

  it('returns 95% when the reindexing documents progress is 1', () => {
    expect(getReindexProgressLabel(1, ReindexStep.reindexStarted)).toBe('95%');
  });

  it('returns 100% when alias has been switched', () => {
    expect(getReindexProgressLabel(null, ReindexStep.aliasCreated)).toBe('100%');
  });
});
