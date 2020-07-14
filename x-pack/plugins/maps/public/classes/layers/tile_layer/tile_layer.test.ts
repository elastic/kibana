/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { ITileLayerArguments, TileLayer } from './tile_layer';
import { SOURCE_TYPES } from '../../../../common/constants';
import { XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { ITMSSource, AbstractTMSSource } from '../../sources/tms_source';
import { ILayer } from '../layer';

const sourceDescriptor: XYZTMSSourceDescriptor = {
  type: SOURCE_TYPES.EMS_XYZ,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.png',
  id: 'foobar',
};

class MockTileSource extends AbstractTMSSource implements ITMSSource {
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

describe('TileLayer', () => {
  it('should use display-label from source', async () => {
    const source = new MockTileSource(sourceDescriptor);

    const args: ITileLayerArguments = {
      source,
      layerDescriptor: { id: 'layerid', sourceDescriptor },
    };

    const layer: ILayer = new TileLayer(args);
    expect(await source.getDisplayName()).toEqual(await layer.getDisplayName());
  });

  it('should override with custom display-label if present', async () => {
    const source = new MockTileSource(sourceDescriptor);
    const layer: ILayer = new TileLayer({
      source,
      layerDescriptor: { id: 'layerid', sourceDescriptor, label: 'custom' },
    });
    expect('custom').toEqual(await layer.getDisplayName());
  });
});
