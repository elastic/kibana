/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XYZTMSSource } from './xyz_tms_source';
import { SOURCE_TYPES } from '../../../../common/constants';
import { XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';

const descriptor: XYZTMSSourceDescriptor = {
  type: SOURCE_TYPES.EMS_XYZ,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.png',
  id: 'foobar',
};
describe('xyz Tilemap Source', () => {
  it('should echo url template for url template', async () => {
    const source = new XYZTMSSource(descriptor);
    const template = await source.getUrlTemplate();
    expect(template).toEqual(descriptor.urlTemplate);
  });
});
