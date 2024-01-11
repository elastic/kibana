/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockSecurityJobs } from './api.mock';
import { filterJobs, getStablePatternTitles, searchFilter } from './helpers';

describe('helpers', () => {
  describe('filterJobs', () => {
    test('returns all jobs when no filter is supplied', () => {
      const filteredJobs = filterJobs({
        jobs: mockSecurityJobs,
        selectedGroups: [],
        showCustomJobs: false,
        showElasticJobs: false,
        filterQuery: '',
      });
      expect(filteredJobs.length).toEqual(mockSecurityJobs.length);
    });
  });

  describe('searchFilter', () => {
    test('returns all jobs when null filterQuery is provided', () => {
      const jobsToDisplay = searchFilter(mockSecurityJobs);
      expect(jobsToDisplay.length).toEqual(mockSecurityJobs.length);
    });

    test('returns correct DisplayJobs when filterQuery matches job.id', () => {
      const jobsToDisplay = searchFilter(mockSecurityJobs, 'rare_process');
      expect(jobsToDisplay.length).toEqual(3);
    });

    test('returns correct DisplayJobs when filterQuery matches job.description', () => {
      const jobsToDisplay = searchFilter(mockSecurityJobs, 'Detect unusually');
      expect(jobsToDisplay.length).toEqual(3);
    });
  });

  describe('getStablePatternTitles', () => {
    test('it returns a stable reference two times in a row with standard strings', () => {
      const one = getStablePatternTitles(['a', 'b', 'c']);
      const two = getStablePatternTitles(['a', 'b', 'c']);
      expect(one).toBe(two);
    });

    test('it returns a stable reference two times in a row with strings interchanged', () => {
      const one = getStablePatternTitles(['c', 'b', 'a']);
      const two = getStablePatternTitles(['a', 'b', 'c']);
      expect(one).toBe(two);
    });
  });
});
