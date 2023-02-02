/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLayerDescriptor } from './create_layer_descriptor';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';

jest.mock('../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});
jest.mock('../../../licensed_features', () => {
  return {
    getIsGoldPlus() {
      return true;
    },
  };
});
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12345'),
}));

test('Should create layer descriptor', () => {
  const layerDescriptor = createLayerDescriptor({
    indexPatternId: 'myIndexPattern',
    geoFieldName: 'myGeoField',
    geoFieldType: ES_GEO_FIELD_TYPE.GEO_POINT,
  });
  expect(layerDescriptor.sourceDescriptor).toEqual({
    applyGlobalQuery: true,
    applyGlobalTime: true,
    filterByMapBounds: true,
    geoField: 'myGeoField',
    id: '12345',
    indexPatternId: 'myIndexPattern',
    applyForceRefresh: true,
    scalingType: 'CLUSTERS',
    sortField: '',
    sortOrder: 'desc',
    tooltipProperties: [],
    topHitsSize: 1,
    topHitsSplitField: '',
    type: 'ES_SEARCH',
  });
});
