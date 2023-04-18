/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFileServiceMock } from '@kbn/files-plugin/server/mocks';
import { FileLimiter } from './files';
import { createFileRequests, createUserRequests } from '../test_utils';

describe('FileLimiter', () => {
  const mockFileService = createFileServiceMock();
  mockFileService.find.mockImplementation(async () => {
    return {
      files: [],
      total: 5,
    };
  });

  const file = new FileLimiter(mockFileService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('public fields', () => {
    it('sets the errorMessage to the 100 limit', () => {
      expect(file.errorMessage).toMatchInlineSnapshot(
        `"Case has reached the maximum allowed number (100) of attached files."`
      );
    });

    it('sets the limit to 100', () => {
      expect(file.limit).toBe(100);
    });
  });

  describe('countOfItemsInRequest', () => {
    it('returns 0 when passed an empty array', () => {
      expect(file.countOfItemsInRequest([])).toBe(0);
    });

    it('returns 0 when the requests are not for files', () => {
      expect(file.countOfItemsInRequest(createUserRequests(2))).toBe(0);
    });

    it('returns 2 when there are 2 file requests', () => {
      expect(file.countOfItemsInRequest(createFileRequests({ numRequests: 2, numFiles: 1 }))).toBe(
        2
      );
    });

    it('returns 2 when there is 1 request with 2 files', () => {
      expect(file.countOfItemsInRequest(createFileRequests({ numRequests: 1, numFiles: 2 }))).toBe(
        2
      );
    });

    it('returns 3 when there is 1 request with 2 files and 1 request with 1 file', () => {
      const requestWith2Files = createFileRequests({ numRequests: 1, numFiles: 2 });
      const requestWith1File = createFileRequests({ numRequests: 1, numFiles: 1 });
      expect(file.countOfItemsInRequest([...requestWith2Files, ...requestWith1File])).toBe(3);
    });

    it('returns 2 when there are 2 requests with a file and 1 user comment request', () => {
      expect(
        file.countOfItemsInRequest([
          ...createUserRequests(1),
          ...createFileRequests({ numRequests: 2, numFiles: 1 }),
        ])
      ).toBe(2);
    });
  });

  describe('countOfItemsWithinCase', () => {
    it('calls the aggregation function with the correct arguments', async () => {
      await file.countOfItemsWithinCase('id');

      expect(mockFileService.find.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "meta": Object {
              "caseIds": Array [
                "id",
              ],
            },
            "perPage": 1,
          },
        ]
      `);
    });

    it('returns 5', async () => {
      expect(await file.countOfItemsWithinCase('id')).toBe(5);
    });
  });
});
