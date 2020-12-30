/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { LayerErrors } from './layer_errors';

test('Should render errors when layer has errors', () => {
  const mockLayer = {
    hasErrors: () => {
      return true;
    },
    getErrors: () => {
      return 'simulated layer error';
    },
  };
  const component = shallow(<LayerErrors layer={mockLayer} />);

  expect(component).toMatchSnapshot();
});

test('should render nothing when layer has no errors', () => {
  const mockLayer = {
    hasErrors: () => {
      return false;
    },
  };
  const component = shallow(<LayerErrors layer={mockLayer} />);

  expect(component).toMatchSnapshot();
});
