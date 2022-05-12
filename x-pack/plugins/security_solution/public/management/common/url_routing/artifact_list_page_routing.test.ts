/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ArtifactListPageUrlParams } from '../../components/artifact_list_page';
import { MANAGEMENT_DEFAULT_PAGE, MANAGEMENT_DEFAULT_PAGE_SIZE } from '../constants';
import {
  getArtifactListPageUrlPath,
  extractArtifactListPageUrlSearchParams,
} from './artifact_list_page_routing';
import {
  getTrustedAppsListPath,
  getBlocklistsListPath,
  getHostIsolationExceptionsListPath,
} from '../routing';

describe('routing', () => {
  describe('extractListPaginationParams()', () => {
    it('extracts default page when not provided', () => {
      expect(extractArtifactListPageUrlSearchParams({}).page).toBe(1);
    });

    it('extracts default page when too small value provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ page: '-1' }).page).toBe(1);
    });

    it('extracts default page when not a number provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ page: 'a' }).page).toBe(1);
    });

    it('extracts only last page when multiple values provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ page: ['1', '2'] }).page).toBe(2);
    });

    it('extracts proper page when single valid value provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ page: '2' }).page).toBe(2);
    });

    it('extracts default page size when not provided', () => {
      expect(extractArtifactListPageUrlSearchParams({}).pageSize).toBe(
        MANAGEMENT_DEFAULT_PAGE_SIZE
      );
    });

    it('extracts default page size when invalid option provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ pageSize: '25' }).pageSize).toBe(
        MANAGEMENT_DEFAULT_PAGE_SIZE
      );
    });

    it('extracts default page size when not a number provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ pageSize: 'a' }).pageSize).toBe(
        MANAGEMENT_DEFAULT_PAGE_SIZE
      );
    });

    it('extracts only last page size when multiple values provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ pageSize: ['10', '20'] }).pageSize).toBe(20);
    });

    it('extracts proper page size when single valid value provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ pageSize: '20' }).pageSize).toBe(20);
    });

    it('extracts proper "show" when single valid value provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ show: 'create' }).show).toBe('create');
    });

    it('extracts only last "show" when multiple values provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ show: ['invalid', 'create'] }).show).toBe(
        'create'
      );
    });

    it('extracts default "show" when no value provided', () => {
      expect(extractArtifactListPageUrlSearchParams({}).show).toBeUndefined();
    });

    it('extracts default "show" when single invalid value provided', () => {
      expect(extractArtifactListPageUrlSearchParams({ show: 'invalid' }).show).toBeUndefined();
    });
  });

  describe('getArtifactListPageUrlPath()', () => {
    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when no parameters provided', (path, getPath) => {
      expect(getArtifactListPageUrlPath(getPath())).toEqual(`/administration/${path}`);
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when only page size provided', (path, getPath) => {
      const pageSize = 20;
      expect(getArtifactListPageUrlPath(getPath({ pageSize }))).toEqual(
        `/administration/${path}?pageSize=${pageSize}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when only page index provided', (path, getPath) => {
      const pageIndex = 2;
      expect(getArtifactListPageUrlPath(getPath({ page: pageIndex }))).toEqual(
        `/administration/${path}?page=${pageIndex}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when only "show" provided', (path, getPath) => {
      const show = 'create';
      expect(getArtifactListPageUrlPath(getPath({ show }))).toEqual(
        `/administration/${path}?show=${show}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when all params provided', (path, getPath) => {
      const location: ArtifactListPageUrlParams = {
        page: 2,
        pageSize: 20,
        show: 'create',
        filter: 'test',
        includedPolicies: 'globally',
      };

      expect(getPath(location)).toEqual(
        `/administration/${path}?page=${location.page}&pageSize=${location.pageSize}&show=${location.show}&filter=${location.filter}&includedPolicies=${location.includedPolicies}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when page index is equal to default', (path, getPath) => {
      const location: ArtifactListPageUrlParams = {
        page: MANAGEMENT_DEFAULT_PAGE,
        pageSize: 20,
        show: 'create',
        filter: '',
        includedPolicies: '',
      };

      expect(getPath(location)).toEqual(
        `/administration/${path}?pageSize=${location.pageSize}&show=${location.show}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when page size is equal to default', (path, getPath) => {
      const location: ArtifactListPageUrlParams = {
        page: 2,
        pageSize: MANAGEMENT_DEFAULT_PAGE_SIZE,
        show: 'create',
        filter: '',
        includedPolicies: '',
      };

      expect(getPath(location)).toEqual(
        `/administration/${path}?page=${location.page}&show=${location.show}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when "show" is equal to default', (path, getPath) => {
      const location: ArtifactListPageUrlParams = {
        page: 2,
        pageSize: 20,
        show: undefined,
        filter: '',
        includedPolicies: '',
      };

      expect(getPath(location)).toEqual(
        `/administration/${path}?page=${location.page}&pageSize=${location.pageSize}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when view type is equal to default', (path, getPath) => {
      const location: ArtifactListPageUrlParams = {
        page: 2,
        pageSize: 20,
        show: 'create',
        filter: '',
        includedPolicies: '',
      };

      expect(getPath(location)).toEqual(
        `/administration/${path}?page=${location.page}&pageSize=${location.pageSize}&show=${location.show}`
      );
    });

    it.each([
      ['trusted_apps', getTrustedAppsListPath],
      ['blocklist', getBlocklistsListPath],
      ['host_isolation_exceptions', getHostIsolationExceptionsListPath],
    ])('builds proper path for %s when params are equal to default', (path, getPath) => {
      const location: ArtifactListPageUrlParams = {
        page: MANAGEMENT_DEFAULT_PAGE,
        pageSize: MANAGEMENT_DEFAULT_PAGE_SIZE,
      };

      expect(getPath(location)).toEqual(`/administration/${path}`);
    });
  });
});
