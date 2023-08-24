/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { getAggsTileRequest, getHitsTileRequest } from './mvt_request_body';
import { RENDER_AS } from './constants';

describe('getAggsTileRequest', () => {
  test(`Should URL encode path parameters`, () => {
    const searchRequest = {
      aggs: {},
      runtime_mappings: {},
      query: {},
    };
    const { path } = getAggsTileRequest({
      buffer: 5,
      risonRequestBody: rison.encode(searchRequest),
      geometryFieldName: 'my location',
      gridPrecision: 8,
      hasLabels: true,
      index: 'my index',
      renderAs: RENDER_AS.POINT,
      x: 0,
      y: 0,
      z: 0,
    });
    expect(path).toEqual('/my%20index/_mvt/my%20location/0/0/0');
  });
});

describe('getHitsTileRequest', () => {
  test(`Should URL encode path parameters`, () => {
    const searchRequest = {
      size: 10000,
      runtime_mappings: {},
      query: {},
    };
    const { path } = getHitsTileRequest({
      buffer: 5,
      risonRequestBody: rison.encode(searchRequest),
      geometryFieldName: 'my location',
      hasLabels: true,
      index: 'my index',
      x: 0,
      y: 0,
      z: 0,
    });
    expect(path).toEqual('/my%20index/_mvt/my%20location/0/0/0');
  });

  describe('sort', () => {
    test(`Should include sort`, () => {
      const searchRequest = {
        size: 10000,
        runtime_mappings: {},
        query: {},
        sort: ['timestamp'],
      };
      const { body } = getHitsTileRequest({
        buffer: 5,
        risonRequestBody: rison.encode(searchRequest),
        geometryFieldName: 'my location',
        hasLabels: true,
        index: 'my index',
        x: 0,
        y: 0,
        z: 0,
      });
      expect(body).toHaveProperty('sort');
    });

    test(`Should not include sort when sort not provided`, () => {
      const searchRequest = {
        size: 10000,
        runtime_mappings: {},
        query: {},
      };
      const { body } = getHitsTileRequest({
        buffer: 5,
        risonRequestBody: rison.encode(searchRequest),
        geometryFieldName: 'my location',
        hasLabels: true,
        index: 'my index',
        x: 0,
        y: 0,
        z: 0,
      });
      expect(body).not.toHaveProperty('sort');
    });
  });
});
