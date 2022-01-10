/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../../../../common/constants';
import { DataFilters, XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { ILayer } from '../layer';
import { EmsVectorTileLayer } from './ems_vector_tile_layer';
import { DataRequestContext } from '../../../actions';
import { EMSTMSSource } from '../../sources/ems_tms_source';

describe('EmsVectorTileLayer', () => {
  it('should correctly inject tileLayerId in meta', async () => {
    const layer: ILayer = new EmsVectorTileLayer({
      source: {
        getTileLayerId: () => {
          return 'myTileLayerId';
        },
        getVectorStyleSheetAndSpriteMeta: () => {
          throw new Error('network error');
        },
      } as unknown as EMSTMSSource,
      layerDescriptor: {
        id: 'layerid',
        sourceDescriptor: {
          type: SOURCE_TYPES.EMS_XYZ,
          urlTemplate: 'https://example.com/{x}/{y}/{z}.png',
          id: 'mockSourceId',
        } as XYZTMSSourceDescriptor,
      },
    });

    let actualMeta;
    let actualErrorMessage;
    const mockContext = {
      startLoading: (requestId: string, token: string, meta: unknown) => {
        actualMeta = meta;
      },
      onLoadError: (requestId: string, token: string, message: string) => {
        actualErrorMessage = message;
      },
      dataFilters: { foo: 'bar' } as unknown as DataFilters,
    } as unknown as DataRequestContext;

    await layer.syncData(mockContext);

    expect(actualMeta).toStrictEqual({ tileLayerId: 'myTileLayerId' });
    expect(actualErrorMessage).toStrictEqual('network error');
  });
});
