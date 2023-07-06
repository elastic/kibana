/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import pReflect from 'p-reflect';
import type { File } from '@kbn/files-plugin/common';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import { bulkDeleteFileAttachments, retrieveFilesIgnoringNotFound } from './bulk_delete';
import { MAX_DELETE_FILES } from '../../../common/constants';
import { createCasesClientMock, createCasesClientMockArgs } from '../mocks';

describe('bulk_delete', () => {
  describe('bulkDeleteFileAttachments', () => {
    describe('errors', () => {
      const casesClient = createCasesClientMock();
      const clientArgs = createCasesClientMockArgs();

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it(`throws 400 when trying to delete more than ${MAX_DELETE_FILES} files at a time`, async () => {
        const fileIds = new Array(MAX_DELETE_FILES + 1).fill('fake-ids');

        await expect(
          bulkDeleteFileAttachments({ caseId: 'mock-id', fileIds }, clientArgs, casesClient)
        ).rejects.toThrowError(
          'Failed to delete file attachments for case: mock-id: Error: The length of the field ids is too long. Array must be of length <= 10'
        );
      });
    });
  });

  describe('retrieveFilesIgnoringNotFound', () => {
    const mockLogger = loggerMock.create();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns an empty array when the results is an empty array', () => {
      expect(retrieveFilesIgnoringNotFound([], [], mockLogger)).toEqual([]);
    });

    it('returns a fulfilled file', async () => {
      expect(retrieveFilesIgnoringNotFound([await createFakeFile()], ['abc'], mockLogger)).toEqual([
        {},
      ]);
    });

    it('logs a warning when encountering a file not found error', async () => {
      const fileNotFound = await pReflect(Promise.reject(new FileNotFoundError('not found')));

      expect(retrieveFilesIgnoringNotFound([fileNotFound], ['abc'], mockLogger)).toEqual([]);
      expect(mockLogger.warn).toBeCalledTimes(1);
      expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Failed to find file id: abc: Error: not found",
        ]
      `);
    });

    it('logs a warning without the fileId when the results length is different from the file ids', async () => {
      const fileNotFound = await pReflect(Promise.reject(new FileNotFoundError('not found')));

      expect(retrieveFilesIgnoringNotFound([fileNotFound], ['abc', '123'], mockLogger)).toEqual([]);
      expect(mockLogger.warn).toBeCalledTimes(1);
      expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "Failed to find file: Error: not found",
        ]
      `);
    });

    it('throws when encountering an error that is not a file not found', async () => {
      const otherError = new Error('other error');
      const otherErrorResult = await pReflect(Promise.reject(new Error('other error')));

      expect.assertions(2);

      expect(() =>
        retrieveFilesIgnoringNotFound([otherErrorResult], ['abc'], mockLogger)
      ).toThrowError(otherError);
      expect(mockLogger.warn).not.toBeCalled();
    });

    it('throws when encountering an error that is not a file not found after a valid file', async () => {
      const otherError = new Error('other error');
      const otherErrorResult = await pReflect(Promise.reject(otherError));
      const fileResult = await createFakeFile();

      expect.assertions(2);

      expect(() =>
        retrieveFilesIgnoringNotFound([fileResult, otherErrorResult], ['1', '2'], mockLogger)
      ).toThrowError(otherError);
      expect(mockLogger.warn).not.toBeCalled();
    });

    it('throws a new error when encountering an error that is a string', async () => {
      // this produces an error because .reject() must be passed an error but I want to test a string just in case
      // eslint-disable-next-line prefer-promise-reject-errors
      const otherErrorResult = await pReflect(Promise.reject('string error'));
      const fileResult = await createFakeFile();

      expect.assertions(2);

      expect(() =>
        retrieveFilesIgnoringNotFound([fileResult, otherErrorResult], ['1', '2'], mockLogger)
      ).toThrowErrorMatchingInlineSnapshot(`"Failed to retrieve file id: 2: string error"`);
      expect(mockLogger.warn).not.toBeCalled();
    });
  });
});

const createFakeFile = () => {
  return pReflect(Promise.resolve({} as File));
};
