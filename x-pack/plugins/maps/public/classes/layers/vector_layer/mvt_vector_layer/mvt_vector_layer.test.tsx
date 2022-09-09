/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

import { shallow } from 'enzyme';

import { Feature } from 'geojson';
import { MVTSingleLayerVectorSource } from '../../../sources/mvt_single_layer_vector_source';
import { IVectorSource } from '../../../sources/vector_source';
import { InnerJoin } from '../../../joins/inner_join';
import {
  TiledSingleLayerVectorSourceDescriptor,
  VectorLayerDescriptor,
} from '../../../../../common/descriptor_types';
import { LAYER_TYPE, SOURCE_TYPES } from '../../../../../common/constants';
import { MvtVectorLayer } from './mvt_vector_layer';

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
): MvtVectorLayer {
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
  const layerDescriptor = MvtVectorLayer.createDescriptor(defaultLayerOptions);
  return new MvtVectorLayer({ layerDescriptor, source: mvtSource, customIcons: [] });
}

test('should have type MVT_VECTOR_LAYER', () => {
  const layer: MvtVectorLayer = createLayer({}, {});
  expect(layer.getType()).toEqual(LAYER_TYPE.MVT_VECTOR);
});

describe('visiblity', () => {
  it('should get minzoom from source', async () => {
    const layer: MvtVectorLayer = createLayer({}, {});
    expect(layer.getMinZoom()).toEqual(4);
  });
  it('should get maxzoom from default', async () => {
    const layer: MvtVectorLayer = createLayer({}, {});
    expect(layer.getMaxZoom()).toEqual(24);
  });
  it('should get maxzoom from layer options', async () => {
    const layer: MvtVectorLayer = createLayer({ maxZoom: 10 }, {});
    expect(layer.getMaxZoom()).toEqual(10);
  });
});

describe('getLayerIcon', () => {
  it('Layers with non-elasticsearch sources should display icon', async () => {
    const layer: MvtVectorLayer = createLayer({}, {});

    const iconAndTooltipContent = layer.getLayerIcon(false);
    const component = shallow(iconAndTooltipContent.icon);
    expect(component).toMatchSnapshot();
  });
});

describe('getFeatureById', () => {
  it('should return null feature', async () => {
    const layer: MvtVectorLayer = createLayer({}, {});
    const feature = layer.getFeatureById('foobar') as Feature;
    expect(feature).toEqual(null);
  });
});

describe('isInitialDataLoadComplete', () => {
  const sourceDataRequestDescriptor = {
    data: {},
    dataId: 'source',
    dataRequestMeta: {},
    dataRequestMetaAtStart: undefined,
    dataRequestToken: undefined,
  };
  test('should return false when tile loading has not started', () => {
    const layer = new MvtVectorLayer({
      customIcons: [],
      layerDescriptor: {
        __dataRequests: [sourceDataRequestDescriptor],
      } as unknown as VectorLayerDescriptor,
      source: {
        getMaxZoom: () => {
          return 24;
        },
        getMinZoom: () => {
          return 0;
        },
      } as unknown as IVectorSource,
    });
    expect(layer.isInitialDataLoadComplete()).toBe(false);
  });

  test('should return false when tiles are loading', () => {
    const layer = new MvtVectorLayer({
      customIcons: [],
      layerDescriptor: {
        __areTilesLoaded: false,
        __dataRequests: [sourceDataRequestDescriptor],
      } as unknown as VectorLayerDescriptor,
      source: {
        getMaxZoom: () => {
          return 24;
        },
        getMinZoom: () => {
          return 0;
        },
      } as unknown as IVectorSource,
    });
    expect(layer.isInitialDataLoadComplete()).toBe(false);
  });

  test('should return true when tiles are loaded', () => {
    const layer = new MvtVectorLayer({
      customIcons: [],
      layerDescriptor: {
        __areTilesLoaded: true,
        __dataRequests: [sourceDataRequestDescriptor],
      } as unknown as VectorLayerDescriptor,
      source: {
        getMaxZoom: () => {
          return 24;
        },
        getMinZoom: () => {
          return 0;
        },
      } as unknown as IVectorSource,
    });
    expect(layer.isInitialDataLoadComplete()).toBe(true);
  });

  test('should return false when tiles are loaded but join is loading', () => {
    const layer = new MvtVectorLayer({
      customIcons: [],
      joins: [
        {
          hasCompleteConfig: () => {
            return true;
          },
          getSourceDataRequestId: () => {
            return 'join_source_a0b0da65-5e1a-4967-9dbe-74f24391afe2';
          },
        } as unknown as InnerJoin,
      ],
      layerDescriptor: {
        __areTilesLoaded: true,
        __dataRequests: [
          sourceDataRequestDescriptor,
          {
            dataId: 'join_source_a0b0da65-5e1a-4967-9dbe-74f24391afe2',
            dataRequestMetaAtStart: {},
            dataRequestToken: Symbol('join request'),
          },
        ],
      } as unknown as VectorLayerDescriptor,
      source: {
        getMaxZoom: () => {
          return 24;
        },
        getMinZoom: () => {
          return 0;
        },
      } as unknown as IVectorSource,
    });
    expect(layer.isInitialDataLoadComplete()).toBe(false);
  });

  test('should return true when tiles are loaded and joins are loaded', () => {
    const layer = new MvtVectorLayer({
      customIcons: [],
      joins: [
        {
          hasCompleteConfig: () => {
            return true;
          },
          getSourceDataRequestId: () => {
            return 'join_source_a0b0da65-5e1a-4967-9dbe-74f24391afe2';
          },
        } as unknown as InnerJoin,
      ],
      layerDescriptor: {
        __areTilesLoaded: true,
        __dataRequests: [
          sourceDataRequestDescriptor,
          {
            data: {},
            dataId: 'join_source_a0b0da65-5e1a-4967-9dbe-74f24391afe2',
            dataRequestMeta: {},
            dataRequestMetaAtStart: undefined,
            dataRequestToken: undefined,
          },
        ],
      } as unknown as VectorLayerDescriptor,
      source: {
        getMaxZoom: () => {
          return 24;
        },
        getMinZoom: () => {
          return 0;
        },
      } as unknown as IVectorSource,
    });
    expect(layer.isInitialDataLoadComplete()).toBe(true);
  });
});
