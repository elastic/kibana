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
import { InventoryLocatorDefinition } from './inventory_locator';
import querystring from 'querystring';

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

const setupInventoryLocator = async () => {
  const inventoryLocator = new InventoryLocatorDefinition();

  return {
    inventoryLocator,
  };
};

describe('Infra Locators', () => {
  describe('Asset Details Locator', () => {
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
    const assetDetails = rison.encodeUnknown(params.assetDetails);

    it('should create a link to Asset Details with no state', async () => {
      const { assetDetailsLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const { assetDetailsLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct fallback params for non-supported assetType using assetDetails', async () => {
      const { assetDetailsLocator } = await setupAssetDetailsLocator();

      const { app, path, state } = await assetDetailsLocator.getLocation({
        ...params,
        assetType: 'pod',
      });

      const expectedDetails = rison.encodeUnknown({
        time: params.assetDetails.dateRange,
      });

      expect(app).toBe('metrics');
      expect(path).toBe(`/detail/pod/${params.assetId}?_a=${expectedDetails}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Asset Details Flyout Locator', () => {
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
    const tableProperties = rison.encodeUnknown(params.tableProperties);
    const assetDetails = rison.encodeUnknown(params.assetDetails);

    it('should create a link to Asset Details Flyout with no state', async () => {
      const { assetDetailsFlyoutLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsFlyoutLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?tableProperties=${tableProperties}&assetDetails=${assetDetails}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const { assetDetailsFlyoutLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsFlyoutLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?tableProperties=${tableProperties}&assetDetails=${assetDetails}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Hosts Locator', () => {
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
    };
    const { query, dateRange, filters, panelFilters, limit, tableProperties } = params;
    const searchString = rison.encodeUnknown({ query, dateRange, filters, panelFilters, limit });
    const tablePropertiesString = rison.encodeUnknown(tableProperties);

    it('should create a link to Hosts with no state', async () => {
      const { hostsLocator } = await setupHostsLocator();
      const { app, path, state } = await hostsLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?_a=${searchString}&tableProperties=${tablePropertiesString}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const { hostsLocator } = await setupHostsLocator();
      const { app, path, state } = await hostsLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/hosts?_a=${searchString}&tableProperties=${tablePropertiesString}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });

  describe('Inventory Locator', () => {
    const params = {
      waffleFilter: { kind: 'kuery', expression: '' },
      waffleTime: {
        currentTime: 1715688477985,
        isAutoReloading: false,
      },
      waffleOptions: {
        accountId: '',
        autoBounds: true,
        boundsOverride: { max: 1, min: 0 },
      },
      customMetrics: undefined,
      customOptions: undefined,
      groupBy: { field: 'cloud.provider' },
      legend: { palette: 'cool', reverseColors: false, steps: 10 },
      metric: '(type:cpu)',
      nodeType: 'host',
      region: '',
      sort: { by: 'name', direction: 'desc' as const },
      timelineOpen: false,
      view: 'map' as const,
    };

    const expected = Object.keys(params).reduce((acc: Record<string, string | undefined>, key) => {
      acc[key] =
        key === 'metric' || key === 'customOptions' || key === 'customMetrics'
          ? params[key]
          : rison.encodeUnknown(params[key as keyof typeof params]);
      return acc;
    }, {});

    const queryStringParams = querystring.stringify(expected);

    it('should create a link to Inventory with no state', async () => {
      const { inventoryLocator } = await setupInventoryLocator();
      const { app, path, state } = await inventoryLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/inventory?${queryStringParams}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const { inventoryLocator } = await setupInventoryLocator();
      const { app, path, state } = await inventoryLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(`/inventory?${queryStringParams}`);
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });
});
