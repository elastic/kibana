/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import { SOURCE_TYPES } from '../../../../common/constants';
import { TiledSingleLayerVectorSourceDescriptor } from '../../../../common/descriptor_types';

const descriptor: TiledSingleLayerVectorSourceDescriptor = {
  type: SOURCE_TYPES.MVT_SINGLE_LAYER,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.pbf',
  layerName: 'foobar',
  minSourceZoom: 4,
  maxSourceZoom: 14,
  fields: [],
};
describe('xyz Tilemap Source', () => {
  it('should echo configuration', async () => {
    const source = new MVTSingleLayerVectorSource(descriptor);
    const config = await source.getUrlTemplateWithMeta();
    expect(config.urlTemplate).toEqual(descriptor.urlTemplate);
  });
});
