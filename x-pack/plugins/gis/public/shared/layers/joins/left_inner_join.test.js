/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LeftInnerJoin } from './left_inner_join';

jest.mock('ui/vis/editors/default/schemas', () => {
  class MockSchemas {}
  return {
    Schemas: MockSchemas
  };
});
jest.mock('../../../kibana_services', () => {});
jest.mock('ui/vis/agg_configs', () => {});
jest.mock('ui/timefilter/timefilter', () => {});


const leftJoin = new LeftInnerJoin({
  leftField: "iso2",
  right: {
    id: "d3625663-5b34-4d50-a784-0d743f676a0c",
    indexPatternId: "90943e30-9a47-11e8-b64d-95841ca0b247",
    indexPatternTitle: "kibana_sample_data_logs",
    term: "geo.dest",
  }
});

describe('joinPropertiesToFeatureCollection', () => {
  const COUNT_PROPERTY_NAME = '__kbnjoin__count_groupby_kibana_sample_data_logs.geo.dest';

  it('Should add join property to features in feature collection', () => {
    const featureCollection = {
      features: [
        {
          properties: {
            iso2: "CN",
          }
        }
      ]
    };
    const propertiesMap = new Map();
    propertiesMap.set('CN', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeatureCollection(featureCollection, propertiesMap);
    expect(featureCollection.features[0].properties).toEqual({
      iso2: "CN",
      [COUNT_PROPERTY_NAME]: 61,
    });
  });

  it('Should delete previous join property values from features in feature collection', () => {
    const featureCollection = {
      features: [
        {
          properties: {
            iso2: "CN",
            [COUNT_PROPERTY_NAME]: 61,
            [`__kbn__scaled(${COUNT_PROPERTY_NAME})`]: 1,
          }
        }
      ]
    };
    const propertiesMap = new Map();

    leftJoin.joinPropertiesToFeatureCollection(featureCollection, propertiesMap);
    expect(featureCollection.features[0].properties).toEqual({
      iso2: "CN",
    });
  });
});
