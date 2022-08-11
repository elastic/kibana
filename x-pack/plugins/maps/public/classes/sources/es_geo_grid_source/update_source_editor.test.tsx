/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { UpdateSourceEditor } from './update_source_editor';
import { GRID_RESOLUTION, LAYER_TYPE, RENDER_AS } from '../../../../common/constants';

jest.mock('uuid/v4', () => {
  return function () {
    return '12345';
  };
});

const defaultProps = {
  currentLayerType: LAYER_TYPE.GEOJSON_VECTOR,
  geoFieldName: 'myLocation',
  indexPatternId: 'foobar',
  onChange: async () => {},
  metrics: [],
  renderAs: RENDER_AS.POINT,
  resolution: GRID_RESOLUTION.COARSE,
};

describe('source editor geo_grid_source', () => {
  test('should render editor', async () => {
    const component = shallow(<UpdateSourceEditor {...defaultProps} />);
    expect(component).toMatchSnapshot();
  });

  test('should not allow editing multiple metrics for heatmap', async () => {
    const component = shallow(
      <UpdateSourceEditor {...defaultProps} currentLayerType={LAYER_TYPE.HEATMAP} />
    );
    expect(component).toMatchSnapshot();
  });
});
