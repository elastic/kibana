/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { AbstractLayer } from './layer';
import { ISource } from '../sources/source';

class MockLayer extends AbstractLayer {}

class MockSource {
  private readonly _fitToBounds: boolean;
  constructor({ fitToBounds = true } = {}) {
    this._fitToBounds = fitToBounds;
  }
  cloneDescriptor() {
    return [{}];
  }

  async supportsFitToBounds() {
    return this._fitToBounds;
  }
}

describe('isFittable', () => {
  [
    {
      isVisible: true,
      fitToBounds: true,
      canFit: true,
    },
    {
      isVisible: false,
      fitToBounds: true,
      canFit: false,
    },
    {
      isVisible: true,
      fitToBounds: false,
      canFit: false,
    },
    {
      isVisible: false,
      fitToBounds: false,
      canFit: false,
    },
    {
      isVisible: true,
      fitToBounds: true,
      includeInFitToBounds: false,
      canFit: false,
    },
  ].forEach((test) => {
    it(`Should take into account layer visibility and bounds-retrieval: ${JSON.stringify(
      test
    )}`, async () => {
      const layerDescriptor = AbstractLayer.createDescriptor({
        visible: test.isVisible,
        includeInFitToBounds: test.includeInFitToBounds,
      });
      const layer = new MockLayer({
        layerDescriptor,
        source: new MockSource({ fitToBounds: test.fitToBounds }) as unknown as ISource,
      });
      expect(await layer.isFittable()).toBe(test.canFit);
    });
  });
});
