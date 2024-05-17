/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({}));

import { shallow } from 'enzyme';
import React from 'react';

import { SOURCE_TYPES } from '../../../../common/constants';
import { TiledSingleLayerVectorSourceDescriptor } from '../../../../common/descriptor_types';
import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { UpdateSourceEditor } from './update_source_editor';

const descriptor: TiledSingleLayerVectorSourceDescriptor = {
  type: SOURCE_TYPES.MVT_SINGLE_LAYER,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.pbf',
  layerName: 'foobar',
  minSourceZoom: 4,
  maxSourceZoom: 14,
  fields: [],
  tooltipProperties: [],
};

test('should render update source editor (fields _should_ be included)', async () => {
  const source = new MVTSingleLayerVectorSource(descriptor);

  const component = shallow(
    <UpdateSourceEditor source={source} tooltipFields={[]} onChange={() => {}} />
  );

  expect(component).toMatchSnapshot();
});
