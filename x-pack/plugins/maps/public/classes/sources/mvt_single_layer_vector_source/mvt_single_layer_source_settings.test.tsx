/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MVTFieldDescriptor } from '../../../../common/descriptor_types';

jest.mock('../../../kibana_services', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import { MVTSingleLayerSourceSettings } from './mvt_single_layer_source_settings';
import { MVTFieldType } from '../../../../common/constants';

const defaultSettings = {
  handleChange: () => {},
  layerName: 'foobar',
  fields: [
    {
      name: 'foo',
      type: MVTFieldType.STRING,
    },
    {
      name: 'food',
      type: MVTFieldType.STRING,
    },
    {
      name: 'fooz',
      type: MVTFieldType.NUMBER,
    },
  ],
  minSourceZoom: 4,
  maxSourceZoom: 14,
  includeFields: true,
};

test('should render with fields', async () => {
  const component = shallow(<MVTSingleLayerSourceSettings {...defaultSettings} />);
  expect(component).toMatchSnapshot();
});

test('should render without fields', async () => {
  const settings = { ...defaultSettings, includeFields: false };
  const component = shallow(<MVTSingleLayerSourceSettings {...settings} />);
  expect(component).toMatchSnapshot();
});
