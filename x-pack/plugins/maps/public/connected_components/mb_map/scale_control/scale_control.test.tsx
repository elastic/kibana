/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { ScaleControl } from './scale_control';
import { LngLat, LngLatBounds, Map as MapboxMap, PointLike } from 'mapbox-gl';

const CLIENT_HEIGHT_PIXELS = 1200;
const DISTANCE_METERS = 87653;

const mockMbMapHandlers: { [key: string]: () => void } = {};
const mockMBMap = ({
  on: (eventName: string, callback: () => void) => {
    mockMbMapHandlers[eventName] = callback;
  },
  off: (eventName: string) => {
    delete mockMbMapHandlers[eventName];
  },
  getContainer: () => {
    return {
      clientHeight: CLIENT_HEIGHT_PIXELS,
    };
  },
  getZoom: () => {
    return 4;
  },
  getBounds: () => {
    return ({
      getNorth: () => {
        return 75;
      },
      getSouth: () => {
        return -60;
      },
    } as unknown) as LngLatBounds;
  },
  unproject: (point: PointLike) => {
    return ({
      distanceTo: (lngLat: LngLat) => {
        return DISTANCE_METERS;
      },
    } as unknown) as LngLat;
  },
} as unknown) as MapboxMap;

test('render', () => {
  const component = shallow(<ScaleControl mbMap={mockMBMap} isFullScreen={false} />);
  expect(component).toMatchSnapshot();
});

test('isFullScreen', () => {
  const component = shallow(<ScaleControl mbMap={mockMBMap} isFullScreen={true} />);
  expect(component).toMatchSnapshot();
});

test('should un-register all map callbacks on unmount', () => {
  const component = mount(<ScaleControl mbMap={mockMBMap} isFullScreen={false} />);

  expect(Object.keys(mockMbMapHandlers).length).toBe(1);

  component.unmount();
  expect(Object.keys(mockMbMapHandlers).length).toBe(0);
});
