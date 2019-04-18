/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable } from 'stream';

jest.doMock('fs', () => ({
  createReadStream(filepath: string): Readable {
    if (filepath === 'ERROR') {
      throw new Error('MOCK ERROR - Invalid Path');
    }
    const readableStream = new Readable();
    const streamData = filepath.split('');
    let cursor = 0;

    readableStream._read = function(size) {
      const current = streamData[cursor++];
      if (typeof current === 'undefined') {
        return this.push(null);
      }
      this.push(current);
    };

    return readableStream;
  },
}));
