/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RasterTileLayer } from './raster_tile_layer';
import { SOURCE_TYPES } from '../../../../common/constants';
import { XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { AbstractSource } from '../../sources/source';
import { ITMSSource } from '../../sources/tms_source';
import { ILayer } from '../layer';

const sourceDescriptor: XYZTMSSourceDescriptor = {
  type: SOURCE_TYPES.EMS_XYZ,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.png',
  id: 'foobar',
};

class MockTileSource extends AbstractSource implements ITMSSource {
  readonly _descriptor: XYZTMSSourceDescriptor;
  constructor(descriptor: XYZTMSSourceDescriptor) {
    super(descriptor, {});
    this._descriptor = descriptor;
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.urlTemplate;
  }

  async getUrlTemplate(): Promise<string> {
    return 'template/{x}/{y}/{z}.png';
  }
}

describe('RasterTileLayer', () => {
  it('should use display-label from source', async () => {
    const source = new MockTileSource(sourceDescriptor);

    const layer: ILayer = new RasterTileLayer({
      source,
      layerDescriptor: { id: 'layerid', sourceDescriptor },
    });
    expect(await source.getDisplayName()).toEqual(await layer.getDisplayName());
  });

  it('should override with custom display-label if present', async () => {
    const source = new MockTileSource(sourceDescriptor);
    const layer: ILayer = new RasterTileLayer({
      source,
      layerDescriptor: { id: 'layerid', sourceDescriptor, label: 'custom' },
    });
    expect('custom').toEqual(await layer.getDisplayName());
  });
});
