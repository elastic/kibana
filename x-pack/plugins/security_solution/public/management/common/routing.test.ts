/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractListPaginationParams, getTrustedAppsListPath } from './routing';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from './constants';

describe('routing', () => {
  describe('extractListPaginationParams()', () => {
    it('extracts default page index when not provided', () => {
      expect(extractListPaginationParams({}).page_index).toBe(MANAGEMENT_DEFAULT_PAGE);
    });

    it('extracts default page index when too small value provided', () => {
      expect(extractListPaginationParams({ page_index: '-1' }).page_index).toBe(
        MANAGEMENT_DEFAULT_PAGE
      );
    });

    it('extracts default page index when not a number provided', () => {
      expect(extractListPaginationParams({ page_index: 'a' }).page_index).toBe(
        MANAGEMENT_DEFAULT_PAGE
      );
    });

    it('extracts only last page index when multiple values provided', () => {
      expect(extractListPaginationParams({ page_index: ['1', '2'] }).page_index).toBe(2);
    });

    it('extracts proper page index when single valid value provided', () => {
      expect(extractListPaginationParams({ page_index: '2' }).page_index).toBe(2);
    });

    it('extracts default page size when not provided', () => {
      expect(extractListPaginationParams({}).page_size).toBe(MANAGEMENT_DEFAULT_PAGE_SIZE);
    });

    it('extracts default page size when invalid option provided', () => {
      expect(extractListPaginationParams({ page_size: '25' }).page_size).toBe(
        MANAGEMENT_DEFAULT_PAGE_SIZE
      );
    });

    it('extracts default page size when not a number provided', () => {
      expect(extractListPaginationParams({ page_size: 'a' }).page_size).toBe(
        MANAGEMENT_DEFAULT_PAGE_SIZE
      );
    });

    it('extracts only last page size when multiple values provided', () => {
      expect(extractListPaginationParams({ page_size: ['10', '20'] }).page_size).toBe(20);
    });

    it('extracts proper page size when single valid value provided', () => {
      expect(extractListPaginationParams({ page_size: '20' }).page_size).toBe(20);
    });
  });

  describe('getTrustedAppsListPath()', () => {
    it('builds proper path when no parameters provided', () => {
      expect(getTrustedAppsListPath()).toEqual('/trusted_apps');
    });

    it('builds proper path when empty parameters provided', () => {
      expect(getTrustedAppsListPath({})).toEqual('/trusted_apps');
    });

    it('builds proper path when no page index provided', () => {
      expect(getTrustedAppsListPath({ page_size: 20 })).toEqual('/trusted_apps?page_size=20');
    });

    it('builds proper path when no page size provided', () => {
      expect(getTrustedAppsListPath({ page_index: 2 })).toEqual('/trusted_apps?page_index=2');
    });

    it('builds proper path when both page index and size provided', () => {
      expect(getTrustedAppsListPath({ page_index: 2, page_size: 20 })).toEqual(
        '/trusted_apps?page_index=2&page_size=20'
      );
    });

    it('builds proper path when page index is equal to default', () => {
      const path = getTrustedAppsListPath({
        page_index: MANAGEMENT_DEFAULT_PAGE,
        page_size: 20,
      });

      expect(path).toEqual('/trusted_apps?page_size=20');
    });

    it('builds proper path when page size is equal to default', () => {
      const path = getTrustedAppsListPath({
        page_index: 2,
        page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
      });

      expect(path).toEqual('/trusted_apps?page_index=2');
    });

    it('builds proper path when both page index and size are equal to default', () => {
      const path = getTrustedAppsListPath({
        page_index: MANAGEMENT_DEFAULT_PAGE,
        page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
      });

      expect(path).toEqual('/trusted_apps');
    });
  });
});
