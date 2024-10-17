/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateArtifactArchiveMock = jest.fn();
export const fetchArtifactVersionsMock = jest.fn();
export const createIndexMock = jest.fn();
export const populateIndexMock = jest.fn();

jest.doMock('./steps', () => {
  const actual = jest.requireActual('./steps');
  return {
    ...actual,
    validateArtifactArchive: validateArtifactArchiveMock,
    fetchArtifactVersions: fetchArtifactVersionsMock,
    createIndex: createIndexMock,
    populateIndex: populateIndexMock,
  };
});

export const downloadToDiskMock = jest.fn();
export const openZipArchiveMock = jest.fn();
export const loadMappingFileMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    downloadToDisk: downloadToDiskMock,
    openZipArchive: openZipArchiveMock,
    loadMappingFile: loadMappingFileMock,
  };
});
