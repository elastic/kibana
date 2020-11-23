/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fileHandler } from './file_parser';
import '@loaders.gl/polyfills';

const cleanAndValidate = jest.fn((a) => a);
const setFileProgress = jest.fn((a) => a);

const testJson = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-104.05, 78.99],
        [-87.22, 78.98],
        [-86.58, 75.94],
        [-104.03, 75.94],
        [-104.05, 78.99],
      ],
    ],
  },
};

const getFileRef = (geoJsonObj = testJson) => {
  const fileContent = JSON.stringify(geoJsonObj);
  return new File([fileContent], 'test.json', { type: 'text/json' });
};

const getFileParseActiveFactory = (boolActive = true) => {
  return jest.fn(() => boolActive);
};

describe('parse file', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should reject and throw error if no file provided', async () => {
    await fileHandler({ file: null }).catch((e) => {
      expect(e.message).toMatch('Error, no file provided');
    });
  });

  it('should abort and resolve to null if file parse cancelled', async () => {
    const fileRef = getFileRef();

    // Cancel file parse
    const getFileParseActive = getFileParseActiveFactory(false);

    const fileHandlerResult = await fileHandler({
      file: fileRef,
      setFileProgress,
      cleanAndValidate,
      getFileParseActive,
    });

    expect(fileHandlerResult).toBeNull();
  });

  it('should normally read single feature valid data', async () => {
    const fileRef = getFileRef();
    const getFileParseActive = getFileParseActiveFactory();
    const { errors } = await fileHandler({
      file: fileRef,
      setFileProgress,
      cleanAndValidate: (x) => x,
      getFileParseActive,
    });

    expect(setFileProgress.mock.calls.length).toEqual(1);
    expect(errors.length).toEqual(0);
  });

  it('should throw if no valid features', async () => {
    const fileRef = getFileRef();
    const getFileParseActive = getFileParseActiveFactory();

    await fileHandler({
      file: fileRef,
      setFileProgress,
      cleanAndValidate: () => undefined, // Simulate clean and validate fail
      getFileParseActive,
    }).catch((e) => {
      expect(e.message).toMatch('Error, no features detected');
    });
  });
});
