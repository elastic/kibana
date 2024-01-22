/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This file was contributed to by generative AI

import { CaseStatuses, CaseSeverity } from '../../../../common/types/domain';
import { removeLegacyValuesFromOptions, getStorableFilters } from './sanitize_filter_options';

describe('removeLegacyValuesFromOptions', () => {
  it('should remove legacy values from options', () => {
    const options: {
      status: Array<CaseStatuses | 'all'>;
      severity: Array<CaseSeverity | 'all'>;
    } = {
      status: ['all', CaseStatuses.open, CaseStatuses['in-progress'], 'all'],
      severity: ['all', CaseSeverity.LOW, 'all'],
    };

    expect(removeLegacyValuesFromOptions(options)).toEqual({
      status: ['open', 'in-progress'],
      severity: ['low'],
    });
  });
});

describe('getStorableFilters', () => {
  it('should return the filters if provided', () => {
    expect(
      getStorableFilters({
        status: [CaseStatuses.open, CaseStatuses['in-progress']],
        severity: [CaseSeverity.LOW],
      })
    ).toEqual({
      status: [CaseStatuses.open, CaseStatuses['in-progress']],
      severity: [CaseSeverity.LOW],
    });
  });

  it('should return undefined if no filters are provided', () => {
    expect(getStorableFilters({})).toEqual({ status: undefined, severity: undefined });
  });
});
