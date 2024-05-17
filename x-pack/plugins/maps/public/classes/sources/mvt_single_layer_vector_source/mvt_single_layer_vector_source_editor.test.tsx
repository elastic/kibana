/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({}));

import { shallow } from 'enzyme';
import React from 'react';

import { MVTSingleLayerVectorSourceEditor } from './mvt_single_layer_vector_source_editor';

test('should render source creation editor (fields should _not_ be included)', async () => {
  const component = shallow(<MVTSingleLayerVectorSourceEditor onSourceConfigChange={() => {}} />);

  expect(component).toMatchSnapshot();
});
