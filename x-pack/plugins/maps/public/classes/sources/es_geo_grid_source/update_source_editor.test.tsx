/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

// @ts-expect-error
import { UpdateSourceEditor } from './update_source_editor';
import { GRID_RESOLUTION, LAYER_TYPE, RENDER_AS } from '../../../../common/constants';

const defaultProps = {
  currentLayerType: LAYER_TYPE.VECTOR,
  indexPatternId: 'foobar',
  onChange: () => {},
  metrics: [],
  renderAs: RENDER_AS.POINT,
  resolution: GRID_RESOLUTION.COARSE,
};

describe('source editor geo_grid_source', () => {
  describe('default vector layer config', () => {
    test('should allow super-fine option', async () => {
      const component = shallow(<UpdateSourceEditor {...defaultProps} />);
      expect(component).toMatchSnapshot();
    });
  });

  describe('should put limitations based on heatmap-rendering selection', () => {
    test('should not allow super-fine option for heatmaps and should not allow multiple metrics', async () => {
      const component = shallow(
        <UpdateSourceEditor {...defaultProps} currentLayerType={LAYER_TYPE.HEATMAP} />
      );
      expect(component).toMatchSnapshot();
    });
  });
});
