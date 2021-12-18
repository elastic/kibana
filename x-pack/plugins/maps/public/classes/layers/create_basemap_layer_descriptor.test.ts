/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../util', () => {
  return {};
});
jest.mock('../../kibana_services', () => {
  return {
    getEMSSettings() {
      return {
        isEMSEnabled: () => {
          return true;
        },
        isEMSUrlSet() {
          return false;
        },
      };
    },
  };
});
jest.mock('uuid/v4', () => {
  return function () {
    return '12345';
  };
});

import { createBasemapLayerDescriptor } from './create_basemap_layer_descriptor';

describe('kibana.yml configured with map.tilemap.url', () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../util').getKibanaTileMap = () => {
      return {
        url: 'myTileUrl',
      };
    };
  });

  it('Should get initial layer with from Kibana tilemap data source', () => {
    expect(createBasemapLayerDescriptor()).toEqual({
      alpha: 1,
      __dataRequests: [],
      id: '12345',
      includeInFitToBounds: true,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      sourceDescriptor: {
        type: 'KIBANA_TILEMAP',
      },
      style: { type: 'TILE' },
      type: 'RASTER_TILE',
      visible: true,
    });
  });
});

describe('EMS is enabled', () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../util').getKibanaTileMap = () => {
      return null;
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../kibana_services').getEmsTileLayerId = () => ({
      bright: 'road_map',
      desaturated: 'road_map_desaturated',
      dark: 'dark_map',
    });
  });

  it('Should get initial layer with EMS tile source', () => {
    expect(createBasemapLayerDescriptor()).toEqual({
      alpha: 1,
      __dataRequests: [],
      id: '12345',
      includeInFitToBounds: true,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      source: undefined,
      sourceDescriptor: {
        isAutoSelect: true,
        lightModeDefault: 'road_map_desaturated',
        type: 'EMS_TMS',
      },
      style: { type: 'TILE' },
      type: 'EMS_VECTOR_TILE',
      visible: true,
    });
  });
});

describe('EMS is not enabled', () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../util').getKibanaTileMap = () => {
      return null;
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../kibana_services').getEMSSettings = () => {
      return {
        isEMSEnabled: () => false,
        isEMSUrlSet() {
          return false;
        },
      };
    };
  });

  it('Should return empty layer list since there are no configured tile layers', () => {
    expect(createBasemapLayerDescriptor()).toBeNull();
  });
});
