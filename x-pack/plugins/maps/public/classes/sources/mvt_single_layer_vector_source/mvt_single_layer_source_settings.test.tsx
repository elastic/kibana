/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../kibana_services', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import { MVTSingleLayerSourceSettings } from './mvt_single_layer_source_settings';

const defaultSettings = {
  handleChange: () => {},
  layerName: 'foobar',
  fields: [],
  minSourceZoom: 4,
  maxSourceZoom: 14,
  showFields: true,
};

test('should render with fields', async () => {
  const component = shallow(<MVTSingleLayerSourceSettings {...defaultSettings} />);
  expect(component).toMatchSnapshot();
});

test('should render without fields', async () => {
  const settings = { ...defaultSettings, showFields: false };
  const component = shallow(<MVTSingleLayerSourceSettings {...settings} />);
  expect(component).toMatchSnapshot();
});

test('should not render fields-editor when there is no layername', async () => {
  const settings = { ...defaultSettings, layerName: '' };
  const component = shallow(<MVTSingleLayerSourceSettings {...settings} />);
  expect(component).toMatchSnapshot();
});
