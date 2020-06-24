/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../kibana_services', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import { UpdateSourceEditor } from './update_source_editor';
import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { TiledSingleLayerVectorSourceDescriptor } from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';

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
