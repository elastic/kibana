/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../common/lib/kibana';

import { ConnectorTypes, CommentType, CaseStatuses } from '../../common/api';
import {
  CASES_URL,
  INTERNAL_BULK_CREATE_ATTACHMENTS_URL,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';

import {
  deleteCases,
  deleteComment,
  getActionLicense,
  getCase,
  getCases,
  getCasesStatus,
  getCaseUserActions,
  getReporters,
  getTags,
  patchCase,
  patchCasesStatus,
  patchComment,
  postCase,
  createAttachments,
  pushCase,
  resolveCase,
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
  caseUserActions,
  pushedCase,
  reporters,
  respReporters,
  tags,
  caseUserActionsSnake,
  casesStatusSnake,
  basicCaseId,
} from './mock';

import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './use_get_cases';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Case Configuration API', () => {
  describe('deleteCases', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue('');
    });
    const data = ['1', '2'];

    test('should be called with correct check url, method, signal', async () => {
      await deleteCases(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'DELETE',
        query: { ids: JSON.stringify(data) },
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
      const resp = await deleteCases(data, abortCtrl.signal);
      expect(resp).toEqual('');
    });
  });

  describe('getActionLicense', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(actionLicenses);
    });

    test('should be called with correct check url, method, signal', async () => {
      await getActionLicense(abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`/api/actions/connector_types`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
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

    test('should be called with correct check url, method, signal', async () => {
      await getCase(data, true, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}`, {
        method: 'GET',
        query: { includeComments: true },
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
      const resp = await getCase(data, true, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
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

    test('should be called with correct check url, method, signal', async () => {
      await resolveCase(caseId, true, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${caseId}/resolve`, {
        method: 'GET',
        query: { includeComments: true },
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
      const resp = await resolveCase(caseId, true, abortCtrl.signal);
      expect(resp).toEqual({ ...basicResolveCase, case: basicCase, targetAliasId });
    });
  });

  describe('getCases', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(allCasesSnake);
    });
    test('should be called with correct check url, method, signal', async () => {
      await getCases({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS, owner: [SECURITY_SOLUTION_OWNER] },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          reporters: [],
          tags: [],
          owner: [SECURITY_SOLUTION_OWNER],
        },
        signal: abortCtrl.signal,
      });
    });

    test('should applies correct filters', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          reporters: [...respReporters, { username: null, full_name: null, email: null }],
          tags,
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
          reporters,
          tags: ['coke', 'pepsi'],
          search: 'hello',
          status: CaseStatuses.open,
          owner: [SECURITY_SOLUTION_OWNER],
        },
        signal: abortCtrl.signal,
      });
    });

    test('should handle tags with weird chars', async () => {
      const weirdTags: string[] = ['(', '"double"'];

      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          reporters: [...respReporters, { username: null, full_name: null, email: null }],
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
          reporters,
          tags: ['(', '"double"'],
          search: 'hello',
          status: CaseStatuses.open,
          owner: [SECURITY_SOLUTION_OWNER],
        },
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
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
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(casesStatusSnake);
    });
    test('should be called with correct check url, method, signal', async () => {
      await getCasesStatus(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/status`, {
        method: 'GET',
        signal: abortCtrl.signal,
        query: { owner: [SECURITY_SOLUTION_OWNER] },
      });
    });

    test('should return correct response', async () => {
      const resp = await getCasesStatus(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
      expect(resp).toEqual(casesStatus);
    });
  });

  describe('getCaseUserActions', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(caseUserActionsSnake);
    });

    test('should be called with correct check url, method, signal', async () => {
      await getCaseUserActions(basicCase.id, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/user_actions`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
      const resp = await getCaseUserActions(basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(caseUserActions);
    });
  });

  describe('getReporters', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(respReporters);
    });

    test('should be called with correct check url, method, signal', async () => {
      await getReporters(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/reporters`, {
        method: 'GET',
        signal: abortCtrl.signal,
        query: {
          owner: [SECURITY_SOLUTION_OWNER],
        },
      });
    });

    test('should return correct response', async () => {
      const resp = await getReporters(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
      expect(resp).toEqual(respReporters);
    });
  });

  describe('getTags', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(tags);
    });

    test('should be called with correct check url, method, signal', async () => {
      await getTags(abortCtrl.signal, [SECURITY_SOLUTION_OWNER]);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/tags`, {
        method: 'GET',
        signal: abortCtrl.signal,
        query: {
          owner: [SECURITY_SOLUTION_OWNER],
        },
      });
    });

    test('should return correct response', async () => {
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
    test('should be called with correct check url, method, signal', async () => {
      await patchCase(basicCase.id, data, basicCase.version, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'PATCH',
        body: JSON.stringify({
          cases: [{ ...data, id: basicCase.id, version: basicCase.version }],
        }),
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
      const resp = await patchCase(
        basicCase.id,
        { description: 'updated description' },
        basicCase.version,
        abortCtrl.signal
      );
      expect(resp).toEqual({ ...[basicCase] });
    });
  });

  describe('patchCasesStatus', () => {
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

    test('should be called with correct check url, method, signal', async () => {
      await patchCasesStatus(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'PATCH',
        body: JSON.stringify({ cases: data }),
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
      const resp = await patchCasesStatus(data, abortCtrl.signal);
      expect(resp).toEqual({ ...cases });
    });
  });

  describe('patchComment', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });

    test('should be called with correct check url, method, signal', async () => {
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

    test('should return correct response', async () => {
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

    test('should be called with correct check url, method, signal', async () => {
      await postCase(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'POST',
        body: JSON.stringify(data),
        signal: abortCtrl.signal,
      });
    });

    test('should return correct response', async () => {
      const resp = await postCase(data, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
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

    test('should be called with correct check url, method, signal', async () => {
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

    test('should return correct response', async () => {
      const resp = await createAttachments(data, basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });
  });

  describe('pushCase', () => {
    const connectorId = 'connectorId';

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(pushedCaseSnake);
    });

    test('should be called with correct check url, method, signal', async () => {
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

    test('should return correct response', async () => {
      const resp = await pushCase(basicCase.id, connectorId, abortCtrl.signal);
      expect(resp).toEqual(pushedCase);
    });
  });

  describe('deleteComment', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(null);
    });
    const commentId = 'ab1234';

    test('should be called with correct check url, method, signal', async () => {
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
});
