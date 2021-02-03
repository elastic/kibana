/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITileLayerArguments } from '../tile_layer/tile_layer';
import { SOURCE_TYPES } from '../../../../common/constants';
import { MapFilters, XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { ITMSSource, AbstractTMSSource } from '../../sources/tms_source';
import { ILayer } from '../layer';
import { VectorTileLayer } from './vector_tile_layer';
import { DataRequestContext } from '../../../actions';

const sourceDescriptor: XYZTMSSourceDescriptor = {
  type: SOURCE_TYPES.EMS_XYZ,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.png',
  id: 'mockSourceId',
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

  getTileLayerId() {
    return this._descriptor.id;
  }

  getVectorStyleSheetAndSpriteMeta() {
    throw new Error('network error');
  }
}

describe('VectorTileLayer', () => {
  it('should correctly inject tileLayerId in meta', async () => {
    const source = new MockTileSource(sourceDescriptor);

    const args: ITileLayerArguments = {
      source,
      layerDescriptor: { id: 'layerid', sourceDescriptor },
    };

    const layer: ILayer = new VectorTileLayer(args);

    let actualMeta;
    let actualErrorMessage;
    const mockContext = ({
      startLoading: (requestId: string, token: string, meta: unknown) => {
        actualMeta = meta;
      },
      onLoadError: (requestId: string, token: string, message: string) => {
        actualErrorMessage = message;
      },
      dataFilters: ({ foo: 'bar' } as unknown) as MapFilters,
    } as unknown) as DataRequestContext;

    await layer.syncData(mockContext);

    expect(actualMeta).toStrictEqual({ tileLayerId: 'mockSourceId' });
    expect(actualErrorMessage).toStrictEqual('network error');
  });
});
