/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { LocationMap } from '../location_map';
import { LocationPoint } from '../embeddables/embedded_map';

// Note For shallow test, we need absolute time strings
describe('LocationMap component', () => {
  let upPoints: LocationPoint[];

  beforeEach(() => {
    upPoints = [
      {
        name: 'New York',
        location: { lat: '40.730610', lon: ' -73.935242' },
      },
      {
        name: 'Tokyo',
        location: { lat: '52.487448', lon: ' 13.394798' },
      },
    ];
  });

  it('renders correctly against snapshot', () => {
    const component = shallowWithIntl(<LocationMap upPoints={upPoints} downPoints={[]} />);
    expect(component).toMatchSnapshot();
  });
});
