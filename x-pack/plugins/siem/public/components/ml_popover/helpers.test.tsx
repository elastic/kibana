/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockSiemJobs } from './__mocks__/api';
import { filterJobs, getStablePatternTitles, searchFilter } from './helpers';

jest.mock('../ml/permissions/has_ml_admin_permissions', () => ({
  hasMlAdminPermissions: () => true,
}));

describe('helpers', () => {
  describe('filterJobs', () => {
    test('returns all jobs when no filter is suplied', () => {
      const filteredJobs = filterJobs({
        jobs: mockSiemJobs,
        selectedGroups: [],
        showCustomJobs: false,
        showElasticJobs: false,
        filterQuery: '',
      });
      expect(filteredJobs.length).toEqual(3);
    });
  });

  describe('searchFilter', () => {
    test('returns all jobs when nullfilterQuery is provided', () => {
      const jobsToDisplay = searchFilter(mockSiemJobs);
      expect(jobsToDisplay.length).toEqual(mockSiemJobs.length);
    });

    test('returns correct DisplayJobs when filterQuery matches job.id', () => {
      const jobsToDisplay = searchFilter(mockSiemJobs, 'rare_process');
      expect(jobsToDisplay.length).toEqual(2);
    });

    test('returns correct DisplayJobs when filterQuery matches job.description', () => {
      const jobsToDisplay = searchFilter(mockSiemJobs, 'Detect unusually');
      expect(jobsToDisplay.length).toEqual(2);
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
