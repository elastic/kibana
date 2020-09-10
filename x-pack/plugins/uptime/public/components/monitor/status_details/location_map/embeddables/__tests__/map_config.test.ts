/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLayerList } from '../map_config';
import { mockLayerList } from './__mocks__/poly_layer_mock';
import { LocationPoint } from '../embedded_map';
import { UptimeAppColors } from '../../../../../../apps/uptime_app';

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

describe('map_config', () => {
  let upPoints: LocationPoint[];
  let downPoints: LocationPoint[];
  let colors: Pick<UptimeAppColors, 'gray' | 'danger'>;

  beforeEach(() => {
    upPoints = [
      { name: 'US-EAST', location: { lat: '52.487239', lon: '13.399262' } },
      { location: { lat: '55.487239', lon: '13.399262' }, name: 'US-WEST' },
      { location: { lat: '54.487239', lon: '14.399262' }, name: 'Europe' },
    ];
    downPoints = [
      { location: { lat: '52.487239', lon: '13.399262' }, name: 'Asia' },
      { location: { lat: '55.487239', lon: '13.399262' }, name: 'APJ' },
      { location: { lat: '54.487239', lon: '14.399262' }, name: 'Canada' },
    ];
    colors = {
      danger: '#BC261E',
      gray: '#000',
    };
  });

  describe('#getLayerList', () => {
    test('it returns the low poly layer', () => {
      const layerList = getLayerList(upPoints, downPoints, colors);
      expect(layerList).toStrictEqual(mockLayerList);
    });
  });
});
