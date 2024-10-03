/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduceAsyncChunks } from './reduce_async_chunks';

describe('reduceAsyncChunks', () => {
  const spyChunkExecutor = jest
    .fn()
    .mockImplementation((chunk: string[]) =>
      Promise.resolve(chunk.map((str) => str.toUpperCase()))
    );

  afterEach(() => {
    spyChunkExecutor.mockClear();
  });

  it('should run a iterator mapping callback on each chunk and merge the result', async () => {
    const input = Array(20).fill('logs-dataset-default');
    const expected = Array(20).fill('LOGS-DATASET-DEFAULT');

    const res = await reduceAsyncChunks(input, spyChunkExecutor);

    expect(res).toEqual(expected);
    expect(spyChunkExecutor).toHaveBeenCalledTimes(1);
  });

  it('should create chunks where the total strings length does not exceed the allowed maximum', async () => {
    const input = Array(1000).fill('logs-dataset-default'); // 20k chars => 20k/3072 => Expected 7 chunks
    const expected = Array(1000).fill('LOGS-DATASET-DEFAULT');
    const expectedChunks = 7;

    const res = await reduceAsyncChunks(input, spyChunkExecutor);

    expect(res).toEqual(expected);
    expect(spyChunkExecutor).toHaveBeenCalledTimes(expectedChunks);
  });

  it('should maximize the chunks length the chunks count', async () => {
    const input = [
      ...Array(1000).fill('logs-dataset_30letters-default'),
      ...Array(1000).fill('logs-dataset-default'),
    ]; // 30k chars + 20k chars + ~2k commas => 52k/3072 => Expected 17 chunks
    const expected = [
      ...Array(1000).fill('LOGS-DATASET_30LETTERS-DEFAULT'),
      ...Array(1000).fill('LOGS-DATASET-DEFAULT'),
    ];
    const expectedChunks = 17;

    const res = await reduceAsyncChunks(input, spyChunkExecutor);

    expect(res).toEqual(expected);
    expect(spyChunkExecutor).toHaveBeenCalledTimes(expectedChunks);
  });
});
