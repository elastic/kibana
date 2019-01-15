/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
    const dataSources = {
      kibana: mockKibanaDataSource,
      ems: mockEmsDataSource
    };
    expect(getInitialLayers(layerListJSON, dataSources)).toEqual(layerListFromSavedObject);
  });
});

describe('Saved object does not have layer list', () => {
  it('Should get initial layer from Kibana tilemap data source when Kibana tilemap is configured ', () => {
    const dataSources = {
      kibana: mockKibanaDataSource,
      ems: mockEmsDataSource
    };

    const layers = getInitialLayers(null, dataSources);
    expect(layers).toEqual([{
      dataRequests: [],
      id: layers[0].id,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      source: undefined,
      sourceDescriptor: {
        type: 'KIBANA_TILEMAP',
        url: 'myTileUrl',
      },
      style: {
        properties: undefined,
        type: 'TILE',
      },
      temporary: false,
      type: 'TILE',
      visible: true,
    }]);
  });

  it('Should get initial layer from ems data source when Kibana tilemap is not configured', () => {
    const dataSources = {
      ems: mockEmsDataSource
    };

    const layers = getInitialLayers(null, dataSources);
    expect(layers).toEqual([{
      dataRequests: [],
      id: layers[0].id,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      source: undefined,
      sourceDescriptor: {
        id: 'elasticTilesAreTheBest',
        type: 'EMS_TMS'
      },
      style: {
        properties: undefined,
        type: 'TILE',
      },
      temporary: false,
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
    expect(getInitialLayers(null, dataSources)).toEqual([]);
  });

  it('Should return empty list when no dataSoures are provided', () => {
    expect(getInitialLayers(null, null)).toEqual([]);
  });
});
