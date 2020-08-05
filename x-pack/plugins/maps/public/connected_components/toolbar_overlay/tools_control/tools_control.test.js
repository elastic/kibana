/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ToolsControl } from './tools_control';

const defaultProps = {
  initiateDraw: () => {},
  cancelDraw: () => {},
  geoFields: [
    {
      geoFieldName: 'location',
      geoFieldType: 'geo_point',
      indexPatternTitle: 'my_index',
      indexPatternId: '1',
    },
  ],
};

test('renders', async () => {
  const component = shallow(<ToolsControl {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('Should render cancel button when drawing', async () => {
  const component = shallow(<ToolsControl {...defaultProps} isDrawingFilter />);

  expect(component).toMatchSnapshot();
});
