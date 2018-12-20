/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';

describe('layer', () => {
  const layer = new ALayer({ layerDescriptor: {} });

  describe('updateDueToExtent', () => {

    it('should be false when the source is not extent aware', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => { return false; }
      };
      const updateDueToExtent = layer.updateDueToExtent(sourceMock);
      expect(updateDueToExtent).toBe(false);
    });

    it('should be false when buffers are the same', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => { return true; }
      };
      const oldBuffer = {
        max_lat: 12.5,
        max_lon: 102.5,
        min_lat: 2.5,
        min_lon: 92.5,
      };
      const newBuffer = {
        max_lat: 12.5,
        max_lon: 102.5,
        min_lat: 2.5,
        min_lon: 92.5,
      };
      const updateDueToExtent = layer.updateDueToExtent(sourceMock, { buffer: oldBuffer }, { buffer: newBuffer });
      expect(updateDueToExtent).toBe(false);
    });

    it('should be false when the new buffer is contained in the old buffer', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => { return true; }
      };
      const oldBuffer = {
        max_lat: 12.5,
        max_lon: 102.5,
        min_lat: 2.5,
        min_lon: 92.5,
      };
      const newBuffer = {
        max_lat: 10,
        max_lon: 100,
        min_lat: 5,
        min_lon: 95,
      };
      const updateDueToExtent = layer.updateDueToExtent(sourceMock, { buffer: oldBuffer }, { buffer: newBuffer });
      expect(updateDueToExtent).toBe(false);
    });

    it('should be true when the new buffer is contained in the old buffer and the past results were truncated', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => { return true; }
      };
      const oldBuffer = {
        max_lat: 12.5,
        max_lon: 102.5,
        min_lat: 2.5,
        min_lon: 92.5,
      };
      const newBuffer = {
        max_lat: 10,
        max_lon: 100,
        min_lat: 5,
        min_lon: 95,
      };
      const updateDueToExtent = layer.updateDueToExtent(
        sourceMock,
        { buffer: oldBuffer, areResultsTrimmed: true },
        { buffer: newBuffer });
      expect(updateDueToExtent).toBe(true);
    });

    it('should be true when meta has no old buffer', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => { return true; }
      };
      const updateDueToExtent = layer.updateDueToExtent(sourceMock);
      expect(updateDueToExtent).toBe(true);
    });

    it('should be true when the new buffer is not contained in the old buffer', async () => {
      const sourceMock = {
        isFilterByMapBounds: () => { return true; }
      };
      const oldBuffer = {
        max_lat: 12.5,
        max_lon: 102.5,
        min_lat: 2.5,
        min_lon: 92.5,
      };
      const newBuffer = {
        max_lat: 7.5,
        max_lon: 92.5,
        min_lat: -2.5,
        min_lon: 82.5,
      };
      const updateDueToExtent = layer.updateDueToExtent(sourceMock, { buffer: oldBuffer }, { buffer: newBuffer });
      expect(updateDueToExtent).toBe(true);
    });
  });
});
