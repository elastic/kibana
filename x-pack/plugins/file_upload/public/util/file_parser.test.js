/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fileHandler } from './file_parser';
jest.mock('./pattern_reader', () => ({}));

const cleanAndValidate = jest.fn(a => a);
const setFileProgress = jest.fn(a => a);

const getFileReader = () => {
  const fileReader = {
    abort: jest.fn(),
  };
  fileReader.readAsBinaryString = jest.fn((binaryString = '123') =>
    fileReader.onloadend({ target: { readyState: FileReader.DONE, result: binaryString } })
  );
  return fileReader;
};
const getPatternReader = () => {
  const patternReader = {
    writeDataToPatternStream: jest.fn(),
    abortStream: jest.fn(),
  };
  require('./pattern_reader').PatternReader = function() {
    this.writeDataToPatternStream = () => patternReader.writeDataToPatternStream();
    this.abortStream = () => patternReader.abortStream();
  };
  return patternReader;
};

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
    expect(fileHandler(null)).rejects.toThrow();
  });

  it('should abort and resolve to null if file parse cancelled', async () => {
    const fileRef = getFileRef();
    const cancelledActionFileReader = getFileReader();
    const cancelledActionPatternReader = getPatternReader();

    // Cancel file parse
    const getFileParseActive = getFileParseActiveFactory(false);

    const fileHandlerResult = await fileHandler({
      file: fileRef,
      setFileProgress,
      cleanAndValidate,
      getFileParseActive,
      fileReader: cancelledActionFileReader,
    });

    expect(fileHandlerResult).toBeNull();
    expect(cancelledActionFileReader.abort.mock.calls.length).toEqual(1);
    expect(cancelledActionPatternReader.abortStream.mock.calls.length).toEqual(1);
  });

  it('should abort on file reader error', () => {
    const fileRef = getFileRef();

    const fileReaderWithErrorCall = getFileReader();
    const patternReaderWithErrorCall = getPatternReader();

    // Trigger on error on read
    fileReaderWithErrorCall.readAsBinaryString = () => fileReaderWithErrorCall.onerror();
    const getFileParseActive = getFileParseActiveFactory();
    expect(
      fileHandler({
        file: fileRef,
        setFileProgress,
        cleanAndValidate,
        getFileParseActive,
        fileReader: fileReaderWithErrorCall,
      })
    ).rejects.toThrow();

    expect(fileReaderWithErrorCall.abort.mock.calls.length).toEqual(1);
    expect(patternReaderWithErrorCall.abortStream.mock.calls.length).toEqual(1);
  });

  // Expect 2 calls, one reads file, next is 'undefined' to
  // both fileReader and patternReader
  it('should normally read binary and emit to patternReader for valid data', async () => {
    const fileRef = getFileRef();
    const fileReaderForValidFile = getFileReader();
    const patternReaderForValidFile = getPatternReader();
    const getFileParseActive = getFileParseActiveFactory();
    fileHandler({
      file: fileRef,
      setFileProgress,
      cleanAndValidate,
      getFileParseActive,
      fileReader: fileReaderForValidFile,
    });

    expect(fileReaderForValidFile.readAsBinaryString.mock.calls.length).toEqual(2);
    expect(patternReaderForValidFile.writeDataToPatternStream.mock.calls.length).toEqual(2);
  });
});
