/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '@kbn/io-ts-utils';
import { RisonValue, encode, decode } from '@kbn/rison';
import { chain as chainE, tryCatch as tryCatchE } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import * as lz from 'lz-string';
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

export const decodeDatasetSelection = (base64DatasetSelection: string): DatasetSelectionPlain => {
  const risonDatasetSelection: RisonValue = lz.decompressFromBase64(base64DatasetSelection);

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

const compressedRisonStringRT = new rt.Type<RisonValue, string, unknown>(
  'CompressedRisonString',
  rt.any.is,
  (unknownInput, context) =>
    pipe(
      rt.string.validate(unknownInput, context),
      chainE((stringInput) => {
        const decompressedValue = lz.decompressFromBase64(stringInput);

        if (decompressedValue === null || decompressedValue === '') {
          return rt.failure(stringInput, context, 'The input is not a compressed value.');
        }

        try {
          return rt.success(decode(decompressedValue));
        } catch (err) {
          return rt.failure(
            stringInput,
            context,
            `The input is not a compressed rison value: ${err}`
          );
        }
      })
    ),
  (risonValue) => lz.compressToBase64(encode(risonValue))
);

export const datasetSelectionFromUrlRT = compressedRisonStringRT.pipe(
  datasetSelectionPlainRT,
  'datasetSelectionFromUrlRt'
);
