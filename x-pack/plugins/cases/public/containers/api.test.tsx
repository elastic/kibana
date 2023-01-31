/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { KibanaServices } from '../common/lib/kibana';

import { ConnectorTypes, CommentType, CaseStatuses, CaseSeverity } from '../../common/api';
import {
  CASES_URL,
  INTERNAL_BULK_CREATE_ATTACHMENTS_URL,
  SECURITY_SOLUTION_OWNER,
  MAX_DOCS_PER_PAGE,
} from '../../common/constants';

import {
  deleteCases,
  deleteComment,
  getActionLicense,
  getCase,
  getCases,
  findCaseUserActions,
  getTags,
  patchCase,
  updateCases,
  patchComment,
  postCase,
  createAttachments,
  pushCase,
  resolveCase,
  getFeatureIds,
  postComment,
} from './api';

import {
  actionLicenses,
  allCases,
  basicCase,
  allCasesSnake,
  basicCaseSnake,
  pushedCaseSnake,
  casesStatus,
  casesSnake,
  cases,
  pushedCase,
  tags,
  findCaseUserActionsResponse,
  casesStatusSnake,
  basicCaseId,
  caseWithRegisteredAttachmentsSnake,
  caseWithRegisteredAttachments,
  caseUserActionsWithRegisteredAttachmentsSnake,
} from './mock';

import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './use_get_cases';
import { getCasesStatus } from '../api';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Cases API', () => {
  describe('deleteCases', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue('');
    });
    const data = ['1', '2'];

    it('should be called with correct check url, method, signal', async () => {
      await deleteCases(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'DELETE',
        query: { ids: JSON.stringify(data) },
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await deleteCases(data, abortCtrl.signal);
      expect(resp).toEqual('');
    });
  });

  describe('getActionLicense', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(actionLicenses);
    });

    it('should be called with correct check url, method, signal', async () => {
      await getActionLicense(abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`/api/actions/connector_types`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await getActionLicense(abortCtrl.signal);
      expect(resp).toEqual(actionLicenses);
    });
  });

  describe('getCase', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });
    const data = basicCase.id;

    it('should be called with correct check url, method, signal', async () => {
      await getCase(data, true, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}`, {
        method: 'GET',
        query: { includeComments: true },
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await getCase(data, true, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(caseWithRegisteredAttachmentsSnake);
      const resp = await getCase(data, true, abortCtrl.signal);
      expect(resp).toEqual(caseWithRegisteredAttachments);
    });
  });

  describe('resolveCase', () => {
    const targetAliasId = '12345';
    const basicResolveCase = {
      outcome: 'aliasMatch',
      case: basicCaseSnake,
    };
    const caseId = basicCase.id;

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue({ ...basicResolveCase, target_alias_id: targetAliasId });
    });

    it('should be called with correct check url, method, signal', async () => {
      await resolveCase(caseId, true, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${caseId}/resolve`, {
        method: 'GET',
        query: { includeComments: true },
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await resolveCase(caseId, true, abortCtrl.signal);
      expect(resp).toEqual({ ...basicResolveCase, case: basicCase, targetAliasId });
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue({
        ...basicResolveCase,
        case: caseWithRegisteredAttachmentsSnake,
        target_alias_id: targetAliasId,
      });

      const resp = await resolveCase(caseId, true, abortCtrl.signal);
      expect(resp).toEqual({
        ...basicResolveCase,
        case: caseWithRegisteredAttachments,
        targetAliasId,
      });
    });
  });

  describe('getCases', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(allCasesSnake);
    });

    it('should be called with correct check url, method, signal with empty defaults', async () => {
      await getCases({
        filterOptions: DEFAULT_FILTER_OPTIONS,
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
        },
        signal: abortCtrl.signal,
      });
    });

    it('should applies correct all filters', async () => {
      await getCases({
        filterOptions: {
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
          assignees: ['123'],
          reporters: [{ username: 'username', full_name: null, email: null }],
          tags,
          status: CaseStatuses.open,
          severity: CaseSeverity.HIGH,
          search: 'hello',
          owner: [SECURITY_SOLUTION_OWNER],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          assignees: ['123'],
          reporters: ['username'],
          tags: ['coke', 'pepsi'],
          search: 'hello',
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
          status: CaseStatuses.open,
          severity: CaseSeverity.HIGH,
          owner: [SECURITY_SOLUTION_OWNER],
        },
        signal: abortCtrl.signal,
      });
    });

    it('should apply the severity field correctly (with severity value)', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          severity: CaseSeverity.HIGH,
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
          severity: CaseSeverity.HIGH,
        },
        signal: abortCtrl.signal,
      });
    });

    it('should not send the severity field with "all" severity value', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          severity: 'all',
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
        },
        signal: abortCtrl.signal,
      });
    });

    it('should apply the severity field correctly (with status value)', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          status: CaseStatuses.open,
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
          status: CaseStatuses.open,
        },
        signal: abortCtrl.signal,
      });
    });

    it('should not send the severity field with "all" status value', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          status: 'all',
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
        },
        signal: abortCtrl.signal,
      });
    });

    it('should not send the assignees field if it an empty array', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          assignees: [],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
        },
        signal: abortCtrl.signal,
      });
    });

    it('should convert a single null value to none', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          assignees: null,
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
          assignees: 'none',
        },
        signal: abortCtrl.signal,
      });
    });

    it('should converts null value in the array to none', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          assignees: [null, '123'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
          assignees: ['none', '123'],
        },
        signal: abortCtrl.signal,
      });
    });

    it('should handle tags with weird chars', async () => {
      const weirdTags: string[] = ['(', '"double"'];

      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          assignees: ['123'],
          reporters: [{ username: undefined, full_name: undefined, email: undefined }],
          tags: weirdTags,
          status: CaseStatuses.open,
          search: 'hello',
          owner: [SECURITY_SOLUTION_OWNER],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          assignees: ['123'],
          reporters: [],
          tags: ['(', '"double"'],
          search: 'hello',
          searchFields: DEFAULT_FILTER_OPTIONS.searchFields,
          status: CaseStatuses.open,
          owner: [SECURITY_SOLUTION_OWNER],
        },
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response and not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(allCasesSnake);
      const resp = await getCases({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: [SECURITY_SOLUTION_OWNER] },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
      expect(resp).toEqual({ ...allCases });
    });
  });

  describe('getCasesStatus', () => {
    const http = httpServiceMock.createStartContract({ basePath: '' });
    http.get.mockResolvedValue(casesStatusSnake);

    beforeEach(() => {
      fetchMock.mockClear();
    });

    it('should be called with correct check url, method, signal', async () => {
      await getCasesStatus({
        http,
        signal: abortCtrl.signal,
        query: { owner: [SECURITY_SOLUTION_OWNER] },
      });

      expect(http.get).toHaveBeenCalledWith(`${CASES_URL}/status`, {
        signal: abortCtrl.signal,
        query: { owner: [SECURITY_SOLUTION_OWNER] },
      });
    });

    it('should return correct response', async () => {
      const resp = await getCasesStatus({
        http,
        signal: abortCtrl.signal,
        query: { owner: SECURITY_SOLUTION_OWNER },
      });

      expect(resp).toEqual(casesStatus);
    });
  });

  describe('findCaseUserActions', () => {
    const findCaseUserActionsSnake = {
      page: 1,
      perPage: 1000,
      total: 20,
      userActions: [...caseUserActionsWithRegisteredAttachmentsSnake],
    };

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(findCaseUserActionsSnake);
    });

    it('should be called with correct check url, method, signal', async () => {
      await findCaseUserActions(basicCase.id, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/user_actions/_find`, {
        method: 'GET',
        signal: abortCtrl.signal,
        query: {
          perPage: MAX_DOCS_PER_PAGE,
        },
      });
    });

    it('should return correct response', async () => {
      const resp = await findCaseUserActions(basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(findCaseUserActionsResponse);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(findCaseUserActionsSnake);
      const resp = await findCaseUserActions(basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(findCaseUserActionsResponse);
    });
  });

  describe('getTags', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(tags);
    });

    it('should be called with correct check url, method, signal', async () => {
      await getTags(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/tags`, {
        method: 'GET',
        signal: abortCtrl.signal,
        query: {
          owner: [SECURITY_SOLUTION_OWNER],
        },
      });
    });

    it('should return correct response', async () => {
      const resp = await getTags(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
      expect(resp).toEqual(tags);
    });
  });

  describe('patchCase', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([basicCaseSnake]);
    });

    const data = { description: 'updated description' };

    it('should be called with correct check url, method, signal', async () => {
      await patchCase(basicCase.id, data, basicCase.version, abortCtrl.signal);

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'PATCH',
        body: JSON.stringify({
          cases: [{ ...data, id: basicCase.id, version: basicCase.version }],
        }),
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await patchCase(
        basicCase.id,
        { description: 'updated description' },
        basicCase.version,
        abortCtrl.signal
      );

      expect(resp).toEqual([basicCase]);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue([caseWithRegisteredAttachmentsSnake]);
      const resp = await patchCase(
        basicCase.id,
        { description: 'updated description' },
        basicCase.version,
        abortCtrl.signal
      );

      expect(resp).toEqual([caseWithRegisteredAttachments]);
    });
  });

  describe('updateCases', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(casesSnake);
    });

    const data = [
      {
        status: CaseStatuses.closed,
        id: basicCase.id,
        version: basicCase.version,
      },
    ];

    it('should be called with correct check url, method, signal', async () => {
      await updateCases(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'PATCH',
        body: JSON.stringify({ cases: data }),
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response should not covert to camel case registered attachments', async () => {
      const resp = await updateCases(data, abortCtrl.signal);
      expect(resp).toEqual(cases);
    });

    it('returns an empty array if the cases are empty', async () => {
      const resp = await updateCases([], abortCtrl.signal);
      expect(resp).toEqual([]);
    });
  });

  describe('patchComment', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });

    it('should be called with correct check url, method, signal', async () => {
      await patchComment({
        caseId: basicCase.id,
        commentId: basicCase.comments[0].id,
        commentUpdate: 'updated comment',
        version: basicCase.comments[0].version,
        signal: abortCtrl.signal,
        owner: SECURITY_SOLUTION_OWNER,
      });

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/comments`, {
        method: 'PATCH',
        body: JSON.stringify({
          comment: 'updated comment',
          type: CommentType.user,
          id: basicCase.comments[0].id,
          version: basicCase.comments[0].version,
          owner: SECURITY_SOLUTION_OWNER,
        }),
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await patchComment({
        caseId: basicCase.id,
        commentId: basicCase.comments[0].id,
        commentUpdate: 'updated comment',
        version: basicCase.comments[0].version,
        signal: abortCtrl.signal,
        owner: SECURITY_SOLUTION_OWNER,
      });
      expect(resp).toEqual(basicCase);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(caseWithRegisteredAttachmentsSnake);

      const resp = await patchComment({
        caseId: basicCase.id,
        commentId: basicCase.comments[0].id,
        commentUpdate: 'updated comment',
        version: basicCase.comments[0].version,
        signal: abortCtrl.signal,
        owner: SECURITY_SOLUTION_OWNER,
      });

      expect(resp).toEqual(caseWithRegisteredAttachments);
    });
  });

  describe('postCase', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });
    const data = {
      description: 'description',
      tags: ['tag'],
      title: 'title',
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      settings: {
        syncAlerts: true,
      },
      owner: SECURITY_SOLUTION_OWNER,
    };

    it('should be called with correct check url, method, signal', async () => {
      await postCase(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'POST',
        body: JSON.stringify(data),
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await postCase(data, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(caseWithRegisteredAttachmentsSnake);
      const resp = await postCase(data, abortCtrl.signal);
      expect(resp).toEqual(caseWithRegisteredAttachments);
    });
  });

  describe('createAttachments', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });
    const data = [
      {
        comment: 'comment',
        owner: SECURITY_SOLUTION_OWNER,
        type: CommentType.user as const,
      },
      {
        alertId: 'test-id',
        index: 'test-index',
        rule: {
          id: 'test-rule',
          name: 'Test',
        },
        owner: SECURITY_SOLUTION_OWNER,
        type: CommentType.alert as const,
      },
    ];

    it('should be called with correct check url, method, signal', async () => {
      await createAttachments(data, basicCase.id, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(
        INTERNAL_BULK_CREATE_ATTACHMENTS_URL.replace('{case_id}', basicCase.id),
        {
          method: 'POST',
          body: JSON.stringify(data),
          signal: abortCtrl.signal,
        }
      );
    });

    it('should return correct response', async () => {
      const resp = await createAttachments(data, basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(caseWithRegisteredAttachmentsSnake);
      const resp = await createAttachments(data, basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(caseWithRegisteredAttachments);
    });
  });

  describe('pushCase', () => {
    const connectorId = 'connectorId';

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(pushedCaseSnake);
    });

    it('should be called with correct check url, method, signal', async () => {
      await pushCase(basicCase.id, connectorId, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(
        `${CASES_URL}/${basicCase.id}/connector/${connectorId}/_push`,
        {
          method: 'POST',
          body: JSON.stringify({}),
          signal: abortCtrl.signal,
        }
      );
    });

    it('should return correct response', async () => {
      const resp = await pushCase(basicCase.id, connectorId, abortCtrl.signal);
      expect(resp).toEqual(pushedCase);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(caseWithRegisteredAttachmentsSnake);
      const resp = await pushCase(basicCase.id, connectorId, abortCtrl.signal);
      expect(resp).toEqual(caseWithRegisteredAttachments);
    });
  });

  describe('deleteComment', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(null);
    });
    const commentId = 'ab1234';

    it('should be called with correct check url, method, signal', async () => {
      const resp = await deleteComment({
        caseId: basicCaseId,
        commentId,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/comments/${commentId}`, {
        method: 'DELETE',
        signal: abortCtrl.signal,
      });
      expect(resp).toBe(undefined);
    });
  });

  describe('getFeatureIds', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(['siem', 'observability']);
    });

    it('should be called with correct check url, method, signal', async () => {
      const resp = await getFeatureIds(
        { registrationContext: ['security', 'observability.logs'] },
        abortCtrl.signal
      );

      expect(fetchMock).toHaveBeenCalledWith(`${BASE_RAC_ALERTS_API_PATH}/_feature_ids`, {
        query: { registrationContext: ['security', 'observability.logs'] },
        signal: abortCtrl.signal,
      });

      expect(resp).toEqual(['siem', 'observability']);
    });
  });

  describe('postComment', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });

    const data = {
      comment: 'Solve this fast!',
      type: CommentType.user as const,
      owner: SECURITY_SOLUTION_OWNER,
    };

    it('should be called with correct check url, method, signal', async () => {
      await postComment(data, basicCase.id, abortCtrl.signal);

      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
        signal: abortCtrl.signal,
      });
    });

    it('should return correct response', async () => {
      const resp = await postComment(data, basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });

    it('should not covert to camel case registered attachments', async () => {
      fetchMock.mockResolvedValue(caseWithRegisteredAttachmentsSnake);
      const resp = await postComment(data, basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(caseWithRegisteredAttachments);
    });
  });
});
