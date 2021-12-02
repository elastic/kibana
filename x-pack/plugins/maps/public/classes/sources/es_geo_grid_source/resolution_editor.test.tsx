/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ResolutionEditor } from './resolution_editor';
import { GRID_RESOLUTION } from '../../../../common/constants';

const defaultProps = {
  isHeatmap: false,
  resolution: GRID_RESOLUTION.COARSE,
  onChange: () => {},
  metrics: [],
};

test('render', () => {
  const component = shallow(<ResolutionEditor {...defaultProps} />);
  expect(component).toMatchSnapshot();
});
