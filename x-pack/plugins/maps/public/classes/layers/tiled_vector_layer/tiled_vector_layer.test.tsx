/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MockSyncContext } from '../__tests__/mock_sync_context';
import sinon from 'sinon';

jest.mock('../../../kibana_services', () => {
  return {
    getUiSettings() {
      return {
        get() {
          return false;
        },
      };
    },
  };
});

import { shallow } from 'enzyme';

import { Feature } from 'geojson';
import { MVTSingleLayerVectorSource } from '../../sources/mvt_single_layer_vector_source';
import {
  DataRequestDescriptor,
  TiledSingleLayerVectorSourceDescriptor,
  VectorLayerDescriptor,
} from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';
import { TiledVectorLayer } from './tiled_vector_layer';

const defaultConfig = {
  urlTemplate: 'https://example.com/{x}/{y}/{z}.pbf',
  layerName: 'foobar',
  minSourceZoom: 4,
  maxSourceZoom: 14,
};

function createLayer(
  layerOptions: Partial<VectorLayerDescriptor> = {},
  sourceOptions: Partial<TiledSingleLayerVectorSourceDescriptor> = {}
): TiledVectorLayer {
  const sourceDescriptor: TiledSingleLayerVectorSourceDescriptor = {
    type: SOURCE_TYPES.MVT_SINGLE_LAYER,
    ...defaultConfig,
    fields: [],
    tooltipProperties: [],
    ...sourceOptions,
  };
  const mvtSource = new MVTSingleLayerVectorSource(sourceDescriptor);

  const defaultLayerOptions = {
    ...layerOptions,
    sourceDescriptor,
  };
  const layerDescriptor = TiledVectorLayer.createDescriptor(defaultLayerOptions);
  return new TiledVectorLayer({ layerDescriptor, source: mvtSource });
}

describe('visiblity', () => {
  it('should get minzoom from source', async () => {
    const layer: TiledVectorLayer = createLayer({}, {});
    expect(layer.getMinZoom()).toEqual(4);
  });
  it('should get maxzoom from default', async () => {
    const layer: TiledVectorLayer = createLayer({}, {});
    expect(layer.getMaxZoom()).toEqual(24);
  });
  it('should get maxzoom from layer options', async () => {
    const layer: TiledVectorLayer = createLayer({ maxZoom: 10 }, {});
    expect(layer.getMaxZoom()).toEqual(10);
  });
});

describe('icon', () => {
  it('should use vector icon', async () => {
    const layer: TiledVectorLayer = createLayer({}, {});

    const iconAndTooltipContent = layer.getCustomIconAndTooltipContent();
    const component = shallow(iconAndTooltipContent.icon);
    expect(component).toMatchSnapshot();
  });
});

describe('getFeatureById', () => {
  it('should return null feature', async () => {
    const layer: TiledVectorLayer = createLayer({}, {});
    const feature = layer.getFeatureById('foobar') as Feature;
    expect(feature).toEqual(null);
  });
});

describe('syncData', () => {
  it('Should sync with source-params', async () => {
    const layer: TiledVectorLayer = createLayer({}, {});

    const syncContext = new MockSyncContext({ dataFilters: {} });

    await layer.syncData(syncContext);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);

    // @ts-expect-error
    const call = syncContext.stopLoading.getCall(0);
    expect(call.args[2]).toEqual(defaultConfig);
  });

  it('Should not resync when no changes to source params', async () => {
    const layer1: TiledVectorLayer = createLayer({}, {});
    const syncContext1 = new MockSyncContext({ dataFilters: {} });

    await layer1.syncData(syncContext1);

    const dataRequestDescriptor: DataRequestDescriptor = {
      data: { ...defaultConfig },
      dataId: 'source',
    };
    const layer2: TiledVectorLayer = createLayer(
      {
        __dataRequests: [dataRequestDescriptor],
      },
      {}
    );
    const syncContext2 = new MockSyncContext({ dataFilters: {} });
    await layer2.syncData(syncContext2);
    // @ts-expect-error
    sinon.assert.notCalled(syncContext2.startLoading);
    // @ts-expect-error
    sinon.assert.notCalled(syncContext2.stopLoading);
  });

  it('Should resync when changes to source params', async () => {
    const layer1: TiledVectorLayer = createLayer({}, {});
    const syncContext1 = new MockSyncContext({ dataFilters: {} });

    await layer1.syncData(syncContext1);

    const dataRequestDescriptor: DataRequestDescriptor = {
      data: defaultConfig,
      dataId: 'source',
    };
    const layer2: TiledVectorLayer = createLayer(
      {
        __dataRequests: [dataRequestDescriptor],
      },
      { layerName: 'barfoo' }
    );
    const syncContext2 = new MockSyncContext({ dataFilters: {} });
    await layer2.syncData(syncContext2);

    // @ts-expect-error
    sinon.assert.calledOnce(syncContext2.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext2.stopLoading);

    // @ts-expect-error
    const call = syncContext2.stopLoading.getCall(0);
    expect(call.args[2]).toEqual({ ...defaultConfig, layerName: 'barfoo' });
  });
});
