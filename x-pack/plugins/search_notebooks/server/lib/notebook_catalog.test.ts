/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import type { Logger } from '@kbn/logging';

// Mocking dependencies
jest.mock('fs/promises');

const mockLogger: Logger = {
  warn: jest.fn(),
  error: jest.fn(),
} as Partial<Logger> as Logger;

import { getNotebook, DEFAULT_NOTEBOOKS } from './notebook_catalog';

describe('getNotebook', () => {
  const options = { logger: mockLogger };
  beforeEach(() => {
    // Reset mocks and cache before each test
    jest.clearAllMocks();
  });

  it('throws an error if given an unknown notebook id', () => {
    expect(getNotebook('some-fake-id', options)).rejects.toThrow('Unknown Notebook ID');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('throws an error if the file is not found', () => {
    const notebookId = DEFAULT_NOTEBOOKS.notebooks[0].id;
    jest.mocked(fs.access).mockReset().mockRejectedValue(new Error('Boom'));

    expect(getNotebook(notebookId, options)).rejects.toThrow('Failed to fetch notebook.');
  });

  it('Reads notebook', () => {
    const notebookId = DEFAULT_NOTEBOOKS.notebooks[0].id;

    jest.mocked(fs.access).mockReset().mockResolvedValue(undefined);

    expect(getNotebook(notebookId, options)).resolves.toMatchObject({
      cells: expect.anything(),
      metadata: expect.anything(),
    });
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(fs.access).toHaveBeenCalledWith(expect.stringContaining(`${notebookId}.json`), 0);
  });
});
