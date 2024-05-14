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
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}&_a=undefined`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const { assetDetailsLocator } = await setupAssetDetailsLocator();
      const { app, path, state } = await assetDetailsLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/detail/${params.assetType}/${params.assetId}?assetDetails=${assetDetails}&_a=undefined`
      );
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
      customMetrics: 'cpu',
      customOptions: '',
      groupBy: { field: 'cloud.provider' },
      legend: { palette: 'cool', reverseColors: false, steps: 10 },
      metric: { type: 'cpu' },
      nodeType: 'host',
      region: '',
      sort: { by: 'name', direction: 'desc' as const },
      timelineOpen: false,
      view: 'map' as const,
    };

    const waffleFilter = rison.encodeUnknown(params.waffleFilter);
    const waffleTime = rison.encodeUnknown(params.waffleTime);
    const waffleOptions = rison.encodeUnknown(params.waffleOptions);
    const customMetrics = rison.encodeUnknown(params.customMetrics);
    const customOptions = rison.encodeUnknown(params.customOptions);
    const groupBy = rison.encodeUnknown(params.groupBy);
    const legend = rison.encodeUnknown(params.legend);
    const metric = rison.encodeUnknown(params.metric);
    const nodeType = rison.encodeUnknown(params.nodeType);
    const region = rison.encodeUnknown(params.region);
    const sort = rison.encodeUnknown(params.sort);
    const timelineOpen = rison.encodeUnknown(params.timelineOpen);
    const view = rison.encodeUnknown(params.view);

    it('should create a link to Inventory with no state', async () => {
      const { inventoryLocator } = await setupInventoryLocator();
      const { app, path, state } = await inventoryLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/inventory?waffleFilter=${waffleFilter}&waffleTime=${waffleTime}&waffleOptions=${waffleOptions}&customMetrics=${customMetrics}&customOptions=${customOptions}&groupBy=${groupBy}&legend=${legend}&metric=${metric}&nodeType=${nodeType}&region=${region}&sort=${sort}&timelineOpen=${timelineOpen}&view=${view}`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });

    it('should return correct structured url', async () => {
      const { inventoryLocator } = await setupInventoryLocator();
      const { app, path, state } = await inventoryLocator.getLocation(params);

      expect(app).toBe('metrics');
      expect(path).toBe(
        `/inventory?waffleFilter=${waffleFilter}&waffleTime=${waffleTime}&waffleOptions=${waffleOptions}&customMetrics=${customMetrics}&customOptions=${customOptions}&groupBy=${groupBy}&legend=${legend}&metric=${metric}&nodeType=${nodeType}&region=${region}&sort=${sort}&timelineOpen=${timelineOpen}&view=${view}`
      );
      expect(state).toBeDefined();
      expect(Object.keys(state)).toHaveLength(0);
    });
  });
});
