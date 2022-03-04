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
import {
  TiledSingleLayerVectorSourceDescriptor,
  VectorLayerDescriptor,
} from '../../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../../common/constants';
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
  return new MvtVectorLayer({ layerDescriptor, source: mvtSource });
}

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
