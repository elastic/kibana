/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from '@kbn/io-ts-utils';
import { encodeDatasetSelection, decodeDatasetSelection } from './encoding';
import { DatasetEncodingError } from './errors';
import { DatasetSelectionPlain } from './types';

describe('DatasetSelection', () => {
  const allDatasetSelectionPlain: DatasetSelectionPlain = {
    selectionType: 'all',
  };
  const encodedAllDatasetSelection = 'BQZwpgNmDGAuCWB7AdgFQJ4AcwC4CGEEAlEA';

  const singleDatasetSelectionPlain: DatasetSelectionPlain = {
    selectionType: 'single',
    selection: {
      name: 'azure',
      version: '1.5.23',
      dataset: {
        name: 'logs-azure.activitylogs-*' as IndexPattern,
        title: 'activitylogs',
      },
    },
  };
  const encodedSingleDatasetSelection =
    'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtFgF4CuATmAHRZzwBu8sAJ5VadAFTkANAlhRU3BPyEiQASklFS8lu0m8wrEEjTkAjBwCsHAEwBmcuvBQeKACqCADmSPJqUVUA==';

  const invalidDatasetSelectionPlain = {
    selectionType: 'single',
    selection: {
      dataset: {
        // Missing mandatory `name` property
        title: 'activitylogs',
      },
    },
  };
  const invalidCompressedId = 'random';
  const invalidEncodedDatasetSelection = 'BQZwpgNmDGAuCWB7AdgFQJ4AcwC4T2QHMoBKIA==';

  describe('#encodeDatasetSelection', () => {
    test('should encode and compress a valid DatasetSelection plain object', () => {
      // Encode AllDatasetSelection plain object
      expect(encodeDatasetSelection(allDatasetSelectionPlain)).toEqual(encodedAllDatasetSelection);
      // Encode SingleDatasetSelection plain object
      expect(encodeDatasetSelection(singleDatasetSelectionPlain)).toEqual(
        encodedSingleDatasetSelection
      );
    });

    test('should throw a DatasetEncodingError if the input is an invalid DatasetSelection plain object', () => {
      const encodingRunner = () =>
        encodeDatasetSelection(invalidDatasetSelectionPlain as DatasetSelectionPlain);

      expect(encodingRunner).toThrow(DatasetEncodingError);
      expect(encodingRunner).toThrow(/^The current dataset selection is invalid/);
    });
  });

  describe('#decodeDatasetSelection', () => {
    test('should decode and decompress a valid encoded string', () => {
      // Decode AllDatasetSelection plain object
      expect(decodeDatasetSelection(encodedAllDatasetSelection)).toEqual(allDatasetSelectionPlain);
      // Decode SingleDatasetSelection plain object
      expect(decodeDatasetSelection(encodedSingleDatasetSelection)).toEqual(
        singleDatasetSelectionPlain
      );
    });

    test('should throw a DatasetEncodingError if the input is an invalid compressed id', () => {
      expect(() => decodeDatasetSelection(invalidCompressedId)).toThrow(
        new DatasetEncodingError('The stored id is not a valid compressed value.')
      );
    });

    test('should throw a DatasetEncodingError if the decompressed value is an invalid DatasetSelection plain object', () => {
      const decodingRunner = () => decodeDatasetSelection(invalidEncodedDatasetSelection);

      expect(decodingRunner).toThrow(DatasetEncodingError);
      expect(decodingRunner).toThrow(/^The current dataset selection is invalid/);
    });
  });

  test('encoding and decoding should restore the original DatasetSelection plain object', () => {
    // Encode/Decode AllDatasetSelection plain object
    expect(decodeDatasetSelection(encodeDatasetSelection(allDatasetSelectionPlain))).toEqual(
      allDatasetSelectionPlain
    );
    // Encode/Decode SingleDatasetSelection plain object
    expect(decodeDatasetSelection(encodeDatasetSelection(singleDatasetSelectionPlain))).toEqual(
      singleDatasetSelectionPlain
    );
  });
});
