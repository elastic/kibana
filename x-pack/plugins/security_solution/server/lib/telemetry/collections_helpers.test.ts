/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { stagingIndices } from './__mocks__/staging_indices';
import {
  type CommonPrefixesConfig,
  chunked,
  chunkedBy,
  findCommonPrefixes,
  chunkStringsByMaxLength,
} from './collections_helpers';

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

describe('telemetry.utils.findCommonPrefixes', () => {
  it('should find common prefixes in simple case', async () => {
    const indices = ['aaa', 'b', 'aa'];
    const config: CommonPrefixesConfig = {
      maxPrefixes: 10,
      maxGroupSize: 10,
      minPrefixSize: 1,
    };

    const output = findCommonPrefixes(indices, config);

    expect(output).toHaveLength(2);
    expect(output.find((v, _) => v.parts.length === 1 && v.parts[0] === 'a')?.indexCount).toEqual(
      2
    );
    expect(output.find((v, _) => v.parts.length === 1 && v.parts[0] === 'b')?.indexCount).toEqual(
      1
    );
  });

  it('should find common prefixes with different minPrefixSize', async () => {
    const indices = ['.ds-AA-0001', '.ds-AA-0002', '.ds-BB-0003'];
    const config: CommonPrefixesConfig = {
      maxPrefixes: 10,
      maxGroupSize: 3,
      minPrefixSize: 5,
    };

    const output = findCommonPrefixes(indices, config);

    expect(output).toHaveLength(2);
    expect(
      output.find((v, _) => v.parts.length === 1 && v.parts[0] === '.ds-A')?.indexCount
    ).toEqual(2);
    expect(
      output.find((v, _) => v.parts.length === 1 && v.parts[0] === '.ds-B')?.indexCount
    ).toEqual(1);
  });

  it('should discard extra indices', async () => {
    const indices = ['aaa', 'aaaaaa', 'aa'];
    const config: CommonPrefixesConfig = {
      maxPrefixes: 1,
      maxGroupSize: 2,
      minPrefixSize: 3,
    };

    const output = findCommonPrefixes(indices, config);

    expect(output).toHaveLength(1);
    expect(output.find((v, _) => v.parts.length === 1 && v.parts[0] === 'aaa')?.indexCount).toEqual(
      2
    );
  });

  it('should group many indices', async () => {
    const indices = stagingIndices;
    const config: CommonPrefixesConfig = {
      maxPrefixes: 8,
      maxGroupSize: 100,
      minPrefixSize: 3,
    };

    const output = findCommonPrefixes(indices, config);

    expect(output).toHaveLength(config.maxPrefixes);
    expect(output.map((v, _) => v.indexCount).reduce((acc, i) => acc + i, 0)).toBe(indices.length);
  });
});

describe('telemetry.utils.splitIndicesByNameLength', () => {
  it('should chunk simple case', async () => {
    const input = ['aa', 'b', 'ccc', 'ddd'];
    const output = chunkStringsByMaxLength(input, 5);
    expect(output).toEqual([['aa', 'b'], ['ccc'], ['ddd']]);
  });

  it('should chunk with remainder', async () => {
    const input = ['aaa', 'b'];
    const output = chunkStringsByMaxLength(input, 10);
    expect(output).toEqual([['aaa', 'b']]);
  });

  it('should chunk with empty list', async () => {
    const input: string[] = [];
    const output = chunkStringsByMaxLength(input, 3);
    expect(output).toEqual([]);
  });

  it('should chunk with single element smaller than max weight', async () => {
    const input = ['aa'];
    const output = chunkStringsByMaxLength(input, 3);
    expect(output).toEqual([['aa']]);
  });

  it('should chunk with single element bigger than max weight', async () => {
    const input = ['aaaa', 'bb'];
    const output = chunkStringsByMaxLength(input, 4);
    expect(output).toEqual([['aaaa'], ['bb']]);
  });
});
