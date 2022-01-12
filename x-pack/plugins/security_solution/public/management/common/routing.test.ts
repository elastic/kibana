/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractTrustedAppsListPageLocation, getTrustedAppsListPath } from './routing';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from './constants';
import { TrustedAppsListPageLocation } from '../pages/trusted_apps/state';

describe('routing', () => {
  describe('extractListPaginationParams()', () => {
    it('extracts default page index when not provided', () => {
      expect(extractTrustedAppsListPageLocation({}).page_index).toBe(MANAGEMENT_DEFAULT_PAGE);
    });

    it('extracts default page index when too small value provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_index: '-1' }).page_index).toBe(
        MANAGEMENT_DEFAULT_PAGE
      );
    });

    it('extracts default page index when not a number provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_index: 'a' }).page_index).toBe(
        MANAGEMENT_DEFAULT_PAGE
      );
    });

    it('extracts only last page index when multiple values provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_index: ['1', '2'] }).page_index).toBe(2);
    });

    it('extracts proper page index when single valid value provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_index: '2' }).page_index).toBe(2);
    });

    it('extracts default page size when not provided', () => {
      expect(extractTrustedAppsListPageLocation({}).page_size).toBe(MANAGEMENT_DEFAULT_PAGE_SIZE);
    });

    it('extracts default page size when invalid option provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_size: '25' }).page_size).toBe(
        MANAGEMENT_DEFAULT_PAGE_SIZE
      );
    });

    it('extracts default page size when not a number provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_size: 'a' }).page_size).toBe(
        MANAGEMENT_DEFAULT_PAGE_SIZE
      );
    });

    it('extracts only last page size when multiple values provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_size: ['10', '20'] }).page_size).toBe(20);
    });

    it('extracts proper page size when single valid value provided', () => {
      expect(extractTrustedAppsListPageLocation({ page_size: '20' }).page_size).toBe(20);
    });

    it('extracts proper "show" when single valid value provided', () => {
      expect(extractTrustedAppsListPageLocation({ show: 'create' }).show).toBe('create');
    });

    it('extracts only last "show" when multiple values provided', () => {
      expect(extractTrustedAppsListPageLocation({ show: ['invalid', 'create'] }).show).toBe(
        'create'
      );
    });

    it('extracts default "show" when no value provided', () => {
      expect(extractTrustedAppsListPageLocation({}).show).toBeUndefined();
    });

    it('extracts default "show" when single invalid value provided', () => {
      expect(extractTrustedAppsListPageLocation({ show: 'invalid' }).show).toBeUndefined();
    });

    it('extracts proper view type when single valid value provided', () => {
      expect(extractTrustedAppsListPageLocation({ view_type: 'list' }).view_type).toBe('list');
    });

    it('extracts only last view type when multiple values provided', () => {
      expect(extractTrustedAppsListPageLocation({ view_type: ['grid', 'list'] }).view_type).toBe(
        'list'
      );
    });

    it('extracts default view type when no value provided', () => {
      expect(extractTrustedAppsListPageLocation({}).view_type).toBe('grid');
    });

    it('extracts default view type when single invalid value provided', () => {
      expect(extractTrustedAppsListPageLocation({ view_type: 'invalid' }).view_type).toBe('grid');
    });
  });

  describe('getTrustedAppsListPath()', () => {
    it('builds proper path when no parameters provided', () => {
      expect(getTrustedAppsListPath()).toEqual('/administration/trusted_apps');
    });

    it('builds proper path when empty parameters provided', () => {
      expect(getTrustedAppsListPath({})).toEqual('/administration/trusted_apps');
    });

    it('builds proper path when only page size provided', () => {
      const pageSize = 20;
      expect(getTrustedAppsListPath({ page_size: pageSize })).toEqual(
        `/administration/trusted_apps?page_size=${pageSize}`
      );
    });

    it('builds proper path when only page index provided', () => {
      const pageIndex = 2;
      expect(getTrustedAppsListPath({ page_index: pageIndex })).toEqual(
        `/administration/trusted_apps?page_index=${pageIndex}`
      );
    });

    it('builds proper path when only "show" provided', () => {
      const show = 'create';
      expect(getTrustedAppsListPath({ show })).toEqual(`/administration/trusted_apps?show=${show}`);
    });

    it('builds proper path when only view type provided', () => {
      const viewType = 'list';
      expect(getTrustedAppsListPath({ view_type: viewType })).toEqual(
        `/administration/trusted_apps?view_type=${viewType}`
      );
    });

    it('builds proper path when all params provided', () => {
      const location: TrustedAppsListPageLocation = {
        page_index: 2,
        page_size: 20,
        show: 'create',
        view_type: 'list',
        filter: 'test',
        included_policies: 'globally',
      };

      expect(getTrustedAppsListPath(location)).toEqual(
        `/administration/trusted_apps?page_index=${location.page_index}&page_size=${location.page_size}&view_type=${location.view_type}&show=${location.show}&filter=${location.filter}&included_policies=${location.included_policies}`
      );
    });

    it('builds proper path when page index is equal to default', () => {
      const location: TrustedAppsListPageLocation = {
        page_index: MANAGEMENT_DEFAULT_PAGE,
        page_size: 20,
        show: 'create',
        view_type: 'list',
        filter: '',
        included_policies: '',
      };
      const path = getTrustedAppsListPath(location);

      expect(path).toEqual(
        `/administration/trusted_apps?page_size=${location.page_size}&view_type=${location.view_type}&show=${location.show}`
      );
    });

    it('builds proper path when page size is equal to default', () => {
      const location: TrustedAppsListPageLocation = {
        page_index: 2,
        page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
        show: 'create',
        view_type: 'list',
        filter: '',
        included_policies: '',
      };
      const path = getTrustedAppsListPath(location);

      expect(path).toEqual(
        `/administration/trusted_apps?page_index=${location.page_index}&view_type=${location.view_type}&show=${location.show}`
      );
    });

    it('builds proper path when "show" is equal to default', () => {
      const location: TrustedAppsListPageLocation = {
        page_index: 2,
        page_size: 20,
        show: undefined,
        view_type: 'list',
        filter: '',
        included_policies: '',
      };
      const path = getTrustedAppsListPath(location);

      expect(path).toEqual(
        `/administration/trusted_apps?page_index=${location.page_index}&page_size=${location.page_size}&view_type=${location.view_type}`
      );
    });

    it('builds proper path when view type is equal to default', () => {
      const location: TrustedAppsListPageLocation = {
        page_index: 2,
        page_size: 20,
        show: 'create',
        view_type: 'grid',
        filter: '',
        included_policies: '',
      };
      const path = getTrustedAppsListPath(location);

      expect(path).toEqual(
        `/administration/trusted_apps?page_index=${location.page_index}&page_size=${location.page_size}&show=${location.show}`
      );
    });

    it('builds proper path when params are equal to default', () => {
      const path = getTrustedAppsListPath({
        page_index: MANAGEMENT_DEFAULT_PAGE,
        page_size: MANAGEMENT_DEFAULT_PAGE_SIZE,
        show: undefined,
        view_type: 'grid',
      });

      expect(path).toEqual('/administration/trusted_apps');
    });
  });
});
