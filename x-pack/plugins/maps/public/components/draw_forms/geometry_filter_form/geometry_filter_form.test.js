/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { GeometryFilterForm } from './geometry_filter_form';

const defaultProps = {
  buttonLabel: 'Create filter',
  intitialGeometryLabel: 'My shape',
  onSubmit: () => {},
};

test('render', async () => {
  const component = shallow(<GeometryFilterForm {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('should render error message', async () => {
  const component = shallow(<GeometryFilterForm {...defaultProps} errorMsg="Simulated error" />);

  expect(component).toMatchSnapshot();
});
