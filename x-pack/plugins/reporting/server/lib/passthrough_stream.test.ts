/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThroughStream } from './passthrough_stream';

describe('PassThroughStream', () => {
  let stream: PassThroughStream;

  beforeEach(() => {
    stream = new PassThroughStream();
  });

  describe('write', () => {
    it('should track number of written bytes', () => {
      stream.write('something');

      expect(stream.bytesWritten).toBe(9);
    });

    it('should resolve promise when the first byte is written', async () => {
      stream.write('a');

      await expect(stream.firstBytePromise).resolves.toBe(undefined);
    });
  });
});
