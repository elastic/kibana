/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { AssetDetailsLocatorDefinition } from './asset_details_locator';
import { AssetDetailsFlyoutLocatorDefinition } from './asset_details_flyout_locator';
import { HostsLocatorDefinition } from './hosts_locator';

const setupAssetDetailsLocator = async () => {
  const assetDetailsLocator = new AssetDetailsLocatorDefinition();
  const assetDetailsFlyoutLocator = new AssetDetailsFlyoutLocatorDefinition();

  return {
    assetDetailsLocator,
    assetDetailsFlyoutLocator,
  };
};

const setupHostsLocator = async () => {
  const hostsLocator = new HostsLocatorDefinition();

  return {
    hostsLocator,
  };
};

describe('Infra Locators', () => {
  describe('Asset Details Locator', () => {
    it('should create a link to Asset Details with no state', async () => {
      const params = {
        assetType: 'host',
        assetId: '1234',
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsLocator.getLocation(params);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}&_a=undefined`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const params = {
        assetType: 'host',
        assetId: '1234',
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsLocator.getLocation(params);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}&_a=undefined`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Asset Details Flyout Locator', () => {
    it('should create a link to Asset Details Flyout with no state', async () => {
      const params = {
        tableProperties: {
          detailsItemId: '1234',
          pagination: {
            pageIndex: 0,
            pageSize: 10,
          },
          sorting: {
            field: 'alertsCount',
          },
        },
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsFlyoutLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsFlyoutLocator.getLocation(params);
      const tableProperties = rison.encodeUnknown(params.tableProperties);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?tableProperties=${tableProperties}&assetDetails=${assetDetails}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const params = {
        tableProperties: {
          detailsItemId: '1234',
          pagination: {
            pageIndex: 0,
            pageSize: 10,
          },
          sorting: {
            field: 'alertsCount',
          },
        },
        assetDetails: {
          tabId: 'testTab',
          dashboardId: 'testDashboard',
          dateRange: {
            from: '2021-01-01T00:00:00.000Z',
            to: '2021-01-02T00:00:00.000Z',
          },
        },
      };
      const { assetDetailsFlyoutLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsFlyoutLocator.getLocation(params);
      const tableProperties = rison.encodeUnknown(params.tableProperties);
      const assetDetails = rison.encodeUnknown(params.assetDetails);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?tableProperties=${tableProperties}&assetDetails=${assetDetails}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Hosts Locator', () => {
    it('should create a link to Hosts with no state', async () => {
      const params = {
        query: {
          language: 'kuery',
          query: 'host.name: "foo"',
        },
        dateRange: {
          from: '2021-01-01T00:00:00.000Z',
          to: '2021-01-02T00:00:00.000Z',
        },
        filters: [],
        panelFilters: [],
        limit: 10,
      };
      const { hostsLocator } = await setupHostsLocator();
      const { app, path, state } = await hostsLocator.getLocation(params);
      const searchString = rison.encodeUnknown(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?_a=${searchString}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const params = {
        query: {
          language: 'kuery',
          query: 'host.name: "test"',
        },
        dateRange: {
          from: '2021-01-01T00:00:00.000Z',
          to: '2021-01-02T00:00:00.000Z',
        },
        filters: [],
        panelFilters: [],
        limit: 10,
      };
      const { hostsLocator } = await setupHostsLocator();
      const { app, path, state } = await hostsLocator.getLocation(params);
      const searchString = rison.encodeUnknown(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?_a=${searchString}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });
});
