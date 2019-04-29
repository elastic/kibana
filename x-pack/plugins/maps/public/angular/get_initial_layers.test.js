/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../meta', () => {
  return {};
});

import { getInitialLayers } from './get_initial_layers';

const mockKibanaDataSource = {
  tilemap: {
    url: 'myTileUrl'
  }
};
const mockEmsDataSource = {
  tms: [
    {
      id: 'elasticTilesAreTheBest'
    }
  ]
};

describe('Saved object has layer list', () => {
  it('Should get initial layers from saved object first', () => {
    const layerListFromSavedObject = [
      {
        id: 'layerId',
        type: 'mockLayer'
      }
    ];
    const layerListJSON = JSON.stringify(layerListFromSavedObject);
    expect((getInitialLayers(layerListJSON))).toEqual(layerListFromSavedObject);
  });
});



describe('Saved object does not have layer list', () => {

  beforeEach(() => {
    require('../meta').isMetaDataLoaded = () => {
      return true;
    };
  });

  function mockDataSourceResponse(dataSources) {
    require('../meta').getDataSourcesSync = () => {
      return dataSources;
    };
    require('../meta').isMetaDataLoaded = () => {
      return true;
    };
  }

  it('should get the default EMS layer when metadata has not loaded yet', () => {
    mockDataSourceResponse();
    require('../meta').isMetaDataLoaded = () => {
      return false;
    };
    const layers = getInitialLayers(null);
    expect(layers).toEqual([{
      alpha: 1,
      __dataRequests: [],
      id: layers[0].id,
      applyGlobalQuery: true,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      sourceDescriptor: {
        type: 'EMS_TMS',
        id: 'road_map',
      },
      style: {
        properties: {},
        type: 'TILE',
      },
      type: 'TILE',
      visible: true,
    }]);
  });


  it('Should get initial layer from Kibana tilemap data source when Kibana tilemap is configured ', () => {

    mockDataSourceResponse({
      kibana: mockKibanaDataSource,
      ems: mockEmsDataSource
    });

    const layers = getInitialLayers(null);
    expect(layers).toEqual([{
      alpha: 1,
      __dataRequests: [],
      id: layers[0].id,
      applyGlobalQuery: true,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      sourceDescriptor: {
        type: 'KIBANA_TILEMAP'
      },
      style: {
        properties: {},
        type: 'TILE',
      },
      type: 'TILE',
      visible: true,
    }]);
  });

  it('Should get initial layer from ems data source when Kibana tilemap is not configured', () => {
    const dataSources = {
      ems: mockEmsDataSource
    };
    mockDataSourceResponse(dataSources);

    const layers = getInitialLayers(null);
    expect(layers).toEqual([{
      alpha: 1,
      __dataRequests: [],
      id: layers[0].id,
      applyGlobalQuery: true,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      source: undefined,
      sourceDescriptor: {
        id: 'elasticTilesAreTheBest',
        type: 'EMS_TMS'
      },
      style: {
        properties: {},
        type: 'TILE',
      },
      type: 'TILE',
      visible: true,
    }]);
  });

  it('Should return empty list when no ems.tms sources are provided', () => {
    const dataSources = {
      ems: {
        tms: []
      }
    };
    mockDataSourceResponse(dataSources);
    expect((getInitialLayers(null))).toEqual([]);
  });

  it('Should return empty list when no dataSoures are provided', () => {
    mockDataSourceResponse(null);
    expect((getInitialLayers(null))).toEqual([]);
  });
});
