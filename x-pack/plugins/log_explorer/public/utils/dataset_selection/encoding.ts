/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode, encode, RisonValue } from '@kbn/rison';
import * as lz from 'lz-string';
import { decodeOrThrow } from '../../../common/runtime_types';
import { DatasetEncodingError } from './errors';
import { DatasetSelectionPlain, datasetSelectionPlainRT } from './types';

export const encodeDatasetSelection = (datasetSelectionPlain: DatasetSelectionPlain) => {
  const safeDatasetSelection = decodeOrThrow(
    datasetSelectionPlainRT,
    (message: string) =>
      new DatasetEncodingError(`The current dataset selection is invalid: ${message}"`)
  )(datasetSelectionPlain);

  return lz.compressToBase64(encode(safeDatasetSelection));
};

export const decodeDatasetSelectionId = (datasetSelectionId: string): DatasetSelectionPlain => {
  const risonDatasetSelection: RisonValue = lz.decompressFromBase64(datasetSelectionId);

  if (risonDatasetSelection === null || risonDatasetSelection === '') {
    throw new DatasetEncodingError('The stored id is not a valid compressed value.');
  }

  const decodedDatasetSelection = decode(risonDatasetSelection);

  const datasetSelection = decodeOrThrow(
    datasetSelectionPlainRT,
    (message: string) =>
      new DatasetEncodingError(`The current dataset selection is invalid: ${message}"`)
  )(decodedDatasetSelection);

  return datasetSelection;
};
