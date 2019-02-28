/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TileLayer } from './tile_layer';
import sinon from 'sinon';

describe('syncData', () => {

  it('Should load URL', async () => {
    const tileUrl = 'http:goodmaps';
    const sourceMock = {
      getUrlTemplate: () => { return tileUrl; }
    };
    const tileLayer = new TileLayer({
      layerDescriptor: {},
      source: sourceMock,
    });
    const startLoadingFake = sinon.fake();
    const stopLoadingFake = sinon.fake();
    const onLoadErrorFake = sinon.fake();
    await tileLayer.syncData({
      startLoading: startLoadingFake,
      stopLoading: stopLoadingFake,
      onLoadError: onLoadErrorFake,
      dataFilters: { zoom: 5 },
    });
    expect(startLoadingFake.callCount).toBe(1);
    expect(stopLoadingFake.callCount).toBe(1);
    expect(stopLoadingFake.lastCall.args[2]).toBe(tileUrl);
    expect(onLoadErrorFake.callCount).toBe(0);
  });

  it('Should call onLoadError when URL is invalid', async () => {
    const sourceMock = {
      getUrlTemplate: () => { return '1.notparsableurl)'; }
    };
    const tileLayer = new TileLayer({
      layerDescriptor: {},
      source: sourceMock,
    });
    const startLoadingFake = sinon.fake();
    const stopLoadingFake = sinon.fake();
    const onLoadErrorFake = sinon.fake();
    await tileLayer.syncData({
      startLoading: startLoadingFake,
      stopLoading: stopLoadingFake,
      onLoadError: onLoadErrorFake,
      dataFilters: { zoom: 5 },
    });
    expect(startLoadingFake.callCount).toBe(1);
    expect(stopLoadingFake.callCount).toBe(0);
    expect(onLoadErrorFake.callCount).toBe(1);
  });
});
