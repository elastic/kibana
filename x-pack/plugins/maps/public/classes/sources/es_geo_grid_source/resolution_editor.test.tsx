/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ResolutionEditor } from './resolution_editor';
import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';

const defaultProps = {
  resolution: GRID_RESOLUTION.COARSE,
  onChange: () => {},
  metrics: [],
};

test('should render 4 tick slider when renderAs is POINT', () => {
  const component = shallow(<ResolutionEditor renderAs={RENDER_AS.POINT} {...defaultProps} />);
  expect(component).toMatchSnapshot();
});

test('should render 4 tick slider when renderAs is GRID', () => {
  const component = shallow(<ResolutionEditor renderAs={RENDER_AS.GRID} {...defaultProps} />);
  expect(component).toMatchSnapshot();
});

test('should render 4 tick slider when renderAs is HEATMAP', () => {
  const component = shallow(<ResolutionEditor renderAs={RENDER_AS.HEATMAP} {...defaultProps} />);
  expect(component).toMatchSnapshot();
});

test('should render 3 tick slider when renderAs is HEX', () => {
  const component = shallow(<ResolutionEditor renderAs={RENDER_AS.HEX} {...defaultProps} />);
  expect(component).toMatchSnapshot();
});
