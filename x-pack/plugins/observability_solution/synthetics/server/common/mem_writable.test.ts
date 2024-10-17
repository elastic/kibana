/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MemWritable } from './mem_writable';

describe('MemWritable', () => {
  it('should write chunks to the buffer', async () => {
    const memWritable = new MemWritable();

    const chunk1 = `step('goto', () => page.goto('https://elastic.co'));`;
    const chunk2 = `step('throw error', () => { throw new Error('error'); });`;
    const expectedBuffer = Buffer.from(chunk1 + chunk2);

    await new Promise<void>((resolve, reject) => {
      memWritable.write(Buffer.from(chunk1), (err) => {
        if (err) {
          reject(err);
        }
        expect(memWritable.buffer).toEqual(Buffer.from(chunk1));
        resolve();
      });
    });
    await new Promise<void>((resolve, reject) => {
      memWritable.write(Buffer.from(chunk2), (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
    expect(memWritable.buffer).toEqual(expectedBuffer);
  });
});
