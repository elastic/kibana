/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => jest.fn().mockReturnValue({
  v4: () => '12345'
}));

import sinon from 'sinon';
import { MockSyncContext } from '../../__fixtures__/mock_sync_context';
import { IMvtVectorSource } from '../../../sources/vector_source';
import { DataRequest } from '../../../util/data_request';
import { syncMvtSourceData } from './mvt_source_data';

const mockSource = {
  getTileSourceLayer: () => {
    return 'aggs';
  },
  getMinZoom: () => {
    return 4;
  },
  getMaxZoom: () => {
    return 14;
  },
  getTileUrl: () => {
    return 'https://example.com/{x}/{y}/{z}.pbf';
  },
  isTimeAware: () => {
    return true;
  },
  isFieldAware: () => {
    return false;
  },
  isQueryAware: () => {
    return false;
  },
  isGeoGridPrecisionAware: () => {
    return false;
  },
  isESSource: () => {
    return false;
  },
} as unknown as IMvtVectorSource;

describe('syncMvtSourceData', () => {
  test('Should sync source data when there are no previous data request', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: undefined,
      requestMeta: {
        ...syncContext.dataFilters,
        applyGlobalQuery: true,
        applyGlobalTime: true,
        applyForceRefresh: true,
        fieldNames: [],
        sourceMeta: {},
        isForceRefresh: false,
        isFeatureEditorOpenForLayer: false,
      },
      source: mockSource,
      syncContext,
    });
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);

    // @ts-expect-error
    const call = syncContext.stopLoading.getCall(0);
    const sourceData = call.args[2];
    expect(sourceData).toEqual({
      tileMinZoom: 4,
      tileMaxZoom: 14,
      tileSourceLayer: 'aggs',
      tileUrl: 'https://example.com/{x}/{y}/{z}.pbf',
      refreshToken: '12345',
      hasLabels: false,
    });
  });

  test('Should not re-sync when there are no changes in source state or search state', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });
    const prevRequestMeta = {
      ...syncContext.dataFilters,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      fieldNames: [],
      sourceMeta: {},
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
    };

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: {
        getMeta: () => {
          return prevRequestMeta;
        },
        getData: () => {
          return {
            tileMinZoom: 4,
            tileMaxZoom: 14,
            tileSourceLayer: 'aggs',
            tileUrl: 'https://example.com/{x}/{y}/{z}.pbf?token=12345',
            refreshToken: '12345',
            hasLabels: false,
          };
        },
      } as unknown as DataRequest,
      requestMeta: { ...prevRequestMeta },
      source: mockSource,
      syncContext,
    });
    // @ts-expect-error
    sinon.assert.notCalled(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.notCalled(syncContext.stopLoading);
  });

  test('Should re-sync with forceRefreshDueToDrawing when there are no changes in source state or search state', async () => {
    const syncContext = {
      ...new MockSyncContext({ dataFilters: {} }),
      forceRefreshDueToDrawing: true,
    };
    const prevRequestMeta = {
      ...syncContext.dataFilters,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      fieldNames: [],
      sourceMeta: {},
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
    };

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: {
        getMeta: () => {
          return prevRequestMeta;
        },
        getData: () => {
          return {
            tileMinZoom: 4,
            tileMaxZoom: 14,
            tileSourceLayer: 'aggs',
            tileUrl: 'https://example.com/{x}/{y}/{z}.pbf?token=12345',
            refreshToken: '12345',
            hasLabels: false,
          };
        },
      } as unknown as DataRequest,
      requestMeta: { ...prevRequestMeta },
      source: mockSource,
      syncContext,
    });
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);
  });

  test('Should re-sync when there are changes to search state', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });
    const prevRequestMeta = {
      ...syncContext.dataFilters,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      fieldNames: [],
      sourceMeta: {},
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
    };

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: {
        getMeta: () => {
          return prevRequestMeta;
        },
        getData: () => {
          return {
            tileMinZoom: 4,
            tileMaxZoom: 14,
            tileSourceLayer: 'aggs',
            tileUrl: 'https://example.com/{x}/{y}/{z}.pbf?token=12345',
            refreshToken: '12345',
            hasLabels: false,
          };
        },
      } as unknown as DataRequest,
      requestMeta: {
        ...prevRequestMeta,
        timeFilters: {
          from: 'now',
          to: '30m',
          mode: 'relative',
        },
      },
      source: mockSource,
      syncContext,
    });

    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);
  });

  test('Should re-sync when tileSourceLayer source state changes: ', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });
    const prevRequestMeta = {
      ...syncContext.dataFilters,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      fieldNames: [],
      sourceMeta: {},
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
    };

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: {
        getMeta: () => {
          return prevRequestMeta;
        },
        getData: () => {
          return {
            tileMinZoom: 4,
            tileMaxZoom: 14,
            tileSourceLayer: 'barfoo', // tileSourceLayer is different then mockSource
            tileUrl: 'https://example.com/{x}/{y}/{z}.pbf?token=12345',
            refreshToken: '12345',
            hasLabels: false,
          };
        },
      } as unknown as DataRequest,
      requestMeta: { ...prevRequestMeta },
      source: mockSource,
      syncContext,
    });
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);
  });

  test('Should re-sync when minZoom source state changes: ', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });
    const prevRequestMeta = {
      ...syncContext.dataFilters,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      fieldNames: [],
      sourceMeta: {},
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
    };

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: {
        getMeta: () => {
          return prevRequestMeta;
        },
        getData: () => {
          return {
            tileMinZoom: 2, // tileMinZoom is different then mockSource
            tileMaxZoom: 14,
            tileSourceLayer: 'aggs',
            tileUrl: 'https://example.com/{x}/{y}/{z}.pbf?token=12345',
            refreshToken: '12345',
            hasLabels: false,
          };
        },
      } as unknown as DataRequest,
      requestMeta: { ...prevRequestMeta },
      source: mockSource,
      syncContext,
    });
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);
  });

  test('Should re-sync when maxZoom source state changes: ', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });
    const prevRequestMeta = {
      ...syncContext.dataFilters,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      fieldNames: [],
      sourceMeta: {},
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
    };

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: {
        getMeta: () => {
          return prevRequestMeta;
        },
        getData: () => {
          return {
            tileMinZoom: 4,
            tileMaxZoom: 9, // tileMinZoom is different then mockSource
            tileSourceLayer: 'aggs',
            tileUrl: 'https://example.com/{x}/{y}/{z}.pbf?token=12345',
            refreshToken: '12345',
            hasLabels: false,
          };
        },
      } as unknown as DataRequest,
      requestMeta: { ...prevRequestMeta },
      source: mockSource,
      syncContext,
    });
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);
  });

  test('Should re-sync when hasLabel state changes', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });
    const prevRequestMeta = {
      ...syncContext.dataFilters,
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
      fieldNames: [],
      sourceMeta: {},
      isForceRefresh: false,
      isFeatureEditorOpenForLayer: false,
    };

    await syncMvtSourceData({
      hasLabels: true,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: {
        getMeta: () => {
          return prevRequestMeta;
        },
        getData: () => {
          return {
            tileMinZoom: 4,
            tileMaxZoom: 14,
            tileSourceLayer: 'aggs',
            tileUrl: 'https://example.com/{x}/{y}/{z}.pbf?token=12345',
            refreshToken: '12345',
            hasLabels: false,
          };
        },
      } as unknown as DataRequest,
      requestMeta: { ...prevRequestMeta },
      source: mockSource,
      syncContext,
    });
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);
  });

  test('Should add layer to vector tile inspector when source is synced', async () => {
    const syncContext = new MockSyncContext({ dataFilters: {} });

    await syncMvtSourceData({
      hasLabels: false,
      layerId: 'layer1',
      layerName: 'my layer',
      prevDataRequest: undefined,
      requestMeta: {
        ...syncContext.dataFilters,
        applyGlobalQuery: true,
        applyGlobalTime: true,
        applyForceRefresh: true,
        fieldNames: [],
        sourceMeta: {},
        isForceRefresh: false,
        isFeatureEditorOpenForLayer: false,
      },
      source: {
        ...mockSource,
        isESSource: () => {
          return true;
        },
      },
      syncContext,
    });
    sinon.assert.calledOnce(syncContext.inspectorAdapters.vectorTiles.addLayer);
  });
});
