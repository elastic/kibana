/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockSyncContext } from '../__fixtures__/mock_sync_context';
import sinon from 'sinon';

jest.mock('../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
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
  sourceOptions: Partial<TiledSingleLayerVectorSourceDescriptor> = {},
  isTimeAware: boolean = false
): TiledVectorLayer {
  const sourceDescriptor: TiledSingleLayerVectorSourceDescriptor = {
    type: SOURCE_TYPES.MVT_SINGLE_LAYER,
    ...defaultConfig,
    fields: [],
    tooltipProperties: [],
    ...sourceOptions,
  };
  const mvtSource = new MVTSingleLayerVectorSource(sourceDescriptor);
  if (isTimeAware) {
    mvtSource.isTimeAware = async () => {
      return true;
    };
    mvtSource.getApplyGlobalTime = () => {
      return true;
    };
  }

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
    const dataRequestDescriptor: DataRequestDescriptor = {
      data: { ...defaultConfig },
      dataId: 'source',
    };
    const layer: TiledVectorLayer = createLayer(
      {
        __dataRequests: [dataRequestDescriptor],
      },
      {}
    );
    const syncContext = new MockSyncContext({ dataFilters: {} });
    await layer.syncData(syncContext);
    // @ts-expect-error
    sinon.assert.notCalled(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.notCalled(syncContext.stopLoading);
  });

  it('Should resync when changes to syncContext', async () => {
    const dataRequestDescriptor: DataRequestDescriptor = {
      data: { ...defaultConfig },
      dataId: 'source',
    };
    const layer: TiledVectorLayer = createLayer(
      {
        __dataRequests: [dataRequestDescriptor],
      },
      {},
      true
    );
    const syncContext = new MockSyncContext({
      dataFilters: {
        timeFilters: {
          from: 'now',
          to: '30m',
          mode: 'relative',
        },
      },
    });
    await layer.syncData(syncContext);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.startLoading);
    // @ts-expect-error
    sinon.assert.calledOnce(syncContext.stopLoading);
  });

  describe('Should resync when changes to source params: ', () => {
    [{ layerName: 'barfoo' }, { minSourceZoom: 1 }, { maxSourceZoom: 12 }].forEach((changes) => {
      it(`change in ${Object.keys(changes).join(',')}`, async () => {
        const dataRequestDescriptor: DataRequestDescriptor = {
          data: defaultConfig,
          dataId: 'source',
        };
        const layer: TiledVectorLayer = createLayer(
          {
            __dataRequests: [dataRequestDescriptor],
          },
          changes
        );
        const syncContext = new MockSyncContext({ dataFilters: {} });
        await layer.syncData(syncContext);

        // @ts-expect-error
        sinon.assert.calledOnce(syncContext.startLoading);
        // @ts-expect-error
        sinon.assert.calledOnce(syncContext.stopLoading);

        // @ts-expect-error
        const call = syncContext.stopLoading.getCall(0);
        expect(call.args[2]).toEqual({ ...defaultConfig, ...changes });
      });
    });
  });
});
