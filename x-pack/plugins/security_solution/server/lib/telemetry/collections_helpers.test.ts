/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { chunked, chunkedBy } from './collections_helpers';

describe('telemetry.utils.chunked', () => {
  it('should chunk simple case', async () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const output = chunked(input, 3);
    expect(output).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
  });

  it('should chunk with remainder', async () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const output = chunked(input, 4);
    expect(output).toEqual([[1, 2, 3, 4], [5, 6, 7, 8], [9]]);
  });

  it('should chunk with empty list', async () => {
    const input: unknown[] = [];
    const output = chunked(input, 4);
    expect(output).toEqual([]);
  });

  it('should chunk with single element', async () => {
    const input = [1];
    const output = chunked(input, 4);
    expect(output).toEqual([[1]]);
  });

  it('should chunk with single element and chunk size 1', async () => {
    const input = [1];
    const output = chunked(input, 1);
    expect(output).toEqual([[1]]);
  });

  it('should chunk arrays smaller than the chunk size', async () => {
    const input = [1];
    const output = chunked(input, 10);
    expect(output).toEqual([[1]]);
  });
});

describe('telemetry.utils.chunkedBy', () => {
  it('should chunk simple case', async () => {
    const input = ['aa', 'b', 'ccc', 'ddd'];
    const output = chunkedBy(input, 3, (v) => v.length);
    expect(output).toEqual([['aa', 'b'], ['ccc'], ['ddd']]);
  });

  it('should chunk with remainder', async () => {
    const input = ['aaa', 'b'];
    const output = chunkedBy(input, 3, (v) => v.length);
    expect(output).toEqual([['aaa'], ['b']]);
  });

  it('should chunk with empty list', async () => {
    const input: string[] = [];
    const output = chunkedBy(input, 3, (v) => v.length);
    expect(output).toEqual([]);
  });

  it('should chunk with single element smaller than max weight', async () => {
    const input = ['aa'];
    const output = chunkedBy(input, 3, (v) => v.length);
    expect(output).toEqual([['aa']]);
  });

  it('should chunk with single element bigger than max weight', async () => {
    const input = ['aaaa'];
    const output = chunkedBy(input, 3, (v) => v.length);
    expect(output).toEqual([['aaaa']]);
  });
});
