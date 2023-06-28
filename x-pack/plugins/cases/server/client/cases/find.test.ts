/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v1 as uuidv1 } from 'uuid';

import type { Case } from '../../../common/api';

import {
  MAX_ASSIGNEES_FILTER_LENGTH,
  MAX_CATEGORY_FILTER_LENGTH,
  MAX_REPORTERS_FILTER_LENGTH,
  MAX_TAGS_FILTER_LENGTH,
} from '../../../common/constants';
import { flattenCaseSavedObject } from '../../common/utils';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs, createCasesClientMockFindRequest } from '../mocks';
import { find } from './find';

describe('find', () => {
  describe('constructSearch', () => {
    const clientArgs = createCasesClientMockArgs();
    const casesMap = new Map<string, Case>(
      mockCases.map((obj) => {
        return [obj.id, flattenCaseSavedObject({ savedObject: obj, totalComment: 2 })];
      })
    );
    clientArgs.services.caseService.findCasesGroupedByID.mockResolvedValue({
      page: 1,
      perPage: 10,
      total: casesMap.size,
      casesMap,
    });
    clientArgs.services.caseService.getCaseStatusStats.mockResolvedValue({
      open: 1,
      'in-progress': 2,
      closed: 3,
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('search by uuid updates search term and adds rootSearchFields', async () => {
      const search = uuidv1();
      const findRequest = createCasesClientMockFindRequest({ search });

      await find(findRequest, clientArgs);
      await expect(clientArgs.services.caseService.findCasesGroupedByID).toHaveBeenCalled();

      const call = clientArgs.services.caseService.findCasesGroupedByID.mock.calls[0][0];

      expect(call.caseOptions.search).toBe(`"${search}" "cases:${search}"`);
      expect(call.caseOptions).toHaveProperty('rootSearchFields');
      expect(call.caseOptions.rootSearchFields).toStrictEqual(['_id']);
    });

    it('regular search term does not cause rootSearchFields to be appended', async () => {
      const search = 'foobar';
      const findRequest = createCasesClientMockFindRequest({ search });
      await find(findRequest, clientArgs);
      await expect(clientArgs.services.caseService.findCasesGroupedByID).toHaveBeenCalled();

      const call = clientArgs.services.caseService.findCasesGroupedByID.mock.calls[0][0];

      expect(call.caseOptions.search).toBe(search);
      expect(call.caseOptions).not.toHaveProperty('rootSearchFields');
    });

    it('should not have foo:bar attribute in request payload', async () => {
      const search = 'sample_text';
      const findRequest = createCasesClientMockFindRequest({ search });
      await expect(
        // @ts-expect-error foo is an invalid field
        find({ ...findRequest, foo: 'bar' }, clientArgs)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find cases: {\\"search\\":\\"sample_text\\",\\"searchFields\\":[\\"title\\",\\"description\\"],\\"severity\\":\\"low\\",\\"assignees\\":[],\\"reporters\\":[],\\"status\\":\\"open\\",\\"tags\\":[],\\"owner\\":[],\\"sortField\\":\\"createdAt\\",\\"sortOrder\\":\\"desc\\",\\"foo\\":\\"bar\\"}: Error: invalid keys \\"foo\\""`
      );
    });
  });

  describe('searchFields errors', () => {
    const clientArgs = createCasesClientMockArgs();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('invalid searchFields with array', async () => {
      const searchFields = ['foobar'];

      // @ts-expect-error
      const findRequest = createCasesClientMockFindRequest({ searchFields });

      await expect(find(findRequest, clientArgs)).rejects.toThrow(
        'Error: Invalid value "foobar" supplied to "searchFields"'
      );
    });

    it('invalid searchFields with single string', async () => {
      const searchFields = 'foobar';

      // @ts-expect-error
      const findRequest = createCasesClientMockFindRequest({ searchFields });

      await expect(find(findRequest, clientArgs)).rejects.toThrow(
        'Error: Invalid value "foobar" supplied to "searchFields"'
      );
    });

    it(`throws an error when the category array has ${MAX_CATEGORY_FILTER_LENGTH} items`, async () => {
      const category = Array(MAX_CATEGORY_FILTER_LENGTH + 1).fill('foobar');

      const findRequest = createCasesClientMockFindRequest({ category });

      await expect(find(findRequest, clientArgs)).rejects.toThrow(
        `Error: Too many categories provided. The maximum allowed is ${MAX_CATEGORY_FILTER_LENGTH}`
      );
    });

    it(`throws an error when the tags array has ${MAX_TAGS_FILTER_LENGTH} items`, async () => {
      const tags = Array(MAX_TAGS_FILTER_LENGTH + 1).fill('foobar');

      const findRequest = createCasesClientMockFindRequest({ tags });

      await expect(find(findRequest, clientArgs)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find cases: {\\"search\\":\\"\\",\\"searchFields\\":[\\"title\\",\\"description\\"],\\"severity\\":\\"low\\",\\"assignees\\":[],\\"reporters\\":[],\\"status\\":\\"open\\",\\"tags\\":[\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\"],\\"owner\\":[],\\"sortField\\":\\"createdAt\\",\\"sortOrder\\":\\"desc\\"}: Error: array must be of length <= 100,Invalid value \\"[\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\"]\\" supplied to \\"tags\\""`
      );
    });

    it(`throws an error when the assignees array has ${MAX_ASSIGNEES_FILTER_LENGTH} items`, async () => {
      const assignees = Array(MAX_ASSIGNEES_FILTER_LENGTH + 1).fill('foobar');

      const findRequest = createCasesClientMockFindRequest({ assignees });

      await expect(find(findRequest, clientArgs)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find cases: {\\"search\\":\\"\\",\\"searchFields\\":[\\"title\\",\\"description\\"],\\"severity\\":\\"low\\",\\"assignees\\":[\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\"],\\"reporters\\":[],\\"status\\":\\"open\\",\\"tags\\":[],\\"owner\\":[],\\"sortField\\":\\"createdAt\\",\\"sortOrder\\":\\"desc\\"}: Error: array must be of length <= 100,Invalid value \\"[\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\"]\\" supplied to \\"assignees\\""`
      );
    });

    it(`throws an error when the reporters array has ${MAX_REPORTERS_FILTER_LENGTH} items`, async () => {
      const reporters = Array(MAX_REPORTERS_FILTER_LENGTH + 1).fill('foobar');

      const findRequest = createCasesClientMockFindRequest({ reporters });

      await expect(find(findRequest, clientArgs)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find cases: {\\"search\\":\\"\\",\\"searchFields\\":[\\"title\\",\\"description\\"],\\"severity\\":\\"low\\",\\"assignees\\":[],\\"reporters\\":[\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\"],\\"status\\":\\"open\\",\\"tags\\":[],\\"owner\\":[],\\"sortField\\":\\"createdAt\\",\\"sortOrder\\":\\"desc\\"}: Error: array must be of length <= 100,Invalid value \\"[\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\",\\"foobar\\"]\\" supplied to \\"reporters\\""`
      );
    });
  });
});
