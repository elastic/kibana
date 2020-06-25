/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../common/lib/kibana';

import { CASES_URL } from '../../../../case/common/constants';

import {
  deleteCases,
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
  postComment,
  pushCase,
  pushToService,
} from './api';

import {
  actionLicenses,
  allCases,
  basicCase,
  allCasesSnake,
  basicCaseSnake,
  actionTypeExecutorResult,
  pushedCaseSnake,
  casesStatus,
  casesSnake,
  cases,
  caseUserActions,
  pushedCase,
  pushSnake,
  reporters,
  respReporters,
  serviceConnector,
  casePushParams,
  tags,
  caseUserActionsSnake,
  casesStatusSnake,
} from './mock';

import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './use_get_cases';
import * as i18n from './translations';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Case Configuration API', () => {
  describe('deleteCases', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue('');
    });
    const data = ['1', '2'];

    test('check url, method, signal', async () => {
      await deleteCases(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'DELETE',
        query: { ids: JSON.stringify(data) },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await deleteCases(data, abortCtrl.signal);
      expect(resp).toEqual('');
    });
  });
  describe('getActionLicense', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(actionLicenses);
    });
    test('check url, method, signal', async () => {
      await getActionLicense(abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`/api/actions/list_action_types`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
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

    test('check url, method, signal', async () => {
      await getCase(data, true, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}`, {
        method: 'GET',
        query: { includeComments: true },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getCase(data, true, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });
  });
  describe('getCases', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(allCasesSnake);
    });
    test('check url, method, signal', async () => {
      await getCases({
        filterOptions: DEFAULT_FILTER_OPTIONS,
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          reporters: [],
          tags: [],
          status: 'open',
        },
        signal: abortCtrl.signal,
      });
    });
    test('correctly applies filters', async () => {
      await getCases({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          reporters: [...respReporters, { username: null, full_name: null, email: null }],
          tags,
          status: '',
          search: 'hello',
        },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/_find`, {
        method: 'GET',
        query: {
          ...DEFAULT_QUERY_PARAMS,
          reporters,
          tags,
          search: 'hello',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getCases({
        filterOptions: DEFAULT_FILTER_OPTIONS,
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
    test('check url, method, signal', async () => {
      await getCasesStatus(abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/status`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getCasesStatus(abortCtrl.signal);
      expect(resp).toEqual(casesStatus);
    });
  });
  describe('getCaseUserActions', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(caseUserActionsSnake);
    });

    test('check url, method, signal', async () => {
      await getCaseUserActions(basicCase.id, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/user_actions`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getCaseUserActions(basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(caseUserActions);
    });
  });
  describe('getReporters', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(respReporters);
    });

    test('check url, method, signal', async () => {
      await getReporters(abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/reporters`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getReporters(abortCtrl.signal);
      expect(resp).toEqual(respReporters);
    });
  });
  describe('getTags', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(tags);
    });

    test('check url, method, signal', async () => {
      await getTags(abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/tags`, {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getTags(abortCtrl.signal);
      expect(resp).toEqual(tags);
    });
  });
  describe('patchCase', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([basicCaseSnake]);
    });
    const data = { description: 'updated description' };
    test('check url, method, signal', async () => {
      await patchCase(basicCase.id, data, basicCase.version, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'PATCH',
        body: JSON.stringify({
          cases: [{ ...data, id: basicCase.id, version: basicCase.version }],
        }),
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
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
        status: 'closed',
        id: basicCase.id,
        version: basicCase.version,
      },
    ];

    test('check url, method, signal', async () => {
      await patchCasesStatus(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'PATCH',
        body: JSON.stringify({ cases: data }),
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await patchCasesStatus(data, abortCtrl.signal);
      expect(resp).toEqual({ ...cases });
    });
  });
  describe('patchComment', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });

    test('check url, method, signal', async () => {
      await patchComment(
        basicCase.id,
        basicCase.comments[0].id,
        'updated comment',
        basicCase.comments[0].version,
        abortCtrl.signal
      );
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/comments`, {
        method: 'PATCH',
        body: JSON.stringify({
          comment: 'updated comment',
          id: basicCase.comments[0].id,
          version: basicCase.comments[0].version,
        }),
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await patchComment(
        basicCase.id,
        basicCase.comments[0].id,
        'updated comment',
        basicCase.comments[0].version,
        abortCtrl.signal
      );
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
    };

    test('check url, method, signal', async () => {
      await postCase(data, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}`, {
        method: 'POST',
        body: JSON.stringify(data),
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await postCase(data, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });
  });
  describe('postComment', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(basicCaseSnake);
    });
    const data = {
      comment: 'comment',
    };

    test('check url, method, signal', async () => {
      await postComment(data, basicCase.id, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await postComment(data, basicCase.id, abortCtrl.signal);
      expect(resp).toEqual(basicCase);
    });
  });
  describe('pushCase', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(pushedCaseSnake);
    });

    test('check url, method, signal', async () => {
      await pushCase(basicCase.id, pushSnake, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`${CASES_URL}/${basicCase.id}/_push`, {
        method: 'POST',
        body: JSON.stringify(pushSnake),
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await pushCase(basicCase.id, pushSnake, abortCtrl.signal);
      expect(resp).toEqual(pushedCase);
    });
  });
  describe('pushToService', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(actionTypeExecutorResult);
    });
    const connectorId = 'connectorId';
    test('check url, method, signal', async () => {
      await pushToService(connectorId, casePushParams, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith(`/api/actions/action/${connectorId}/_execute`, {
        method: 'POST',
        body: JSON.stringify({
          params: { subAction: 'pushToService', subActionParams: casePushParams },
        }),
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await pushToService(connectorId, casePushParams, abortCtrl.signal);
      expect(resp).toEqual(serviceConnector);
    });

    test('unhappy path - serviceMessage', async () => {
      const theError = 'the error';
      fetchMock.mockResolvedValue({
        ...actionTypeExecutorResult,
        status: 'error',
        serviceMessage: theError,
        message: 'not it',
      });
      await expect(
        pushToService(connectorId, casePushParams, abortCtrl.signal)
      ).rejects.toMatchObject({ message: theError });
    });

    test('unhappy path - message', async () => {
      const theError = 'the error';
      fetchMock.mockResolvedValue({
        ...actionTypeExecutorResult,
        status: 'error',
        message: theError,
      });
      await expect(
        pushToService(connectorId, casePushParams, abortCtrl.signal)
      ).rejects.toMatchObject({ message: theError });
    });

    test('unhappy path - no message', async () => {
      const theError = i18n.ERROR_PUSH_TO_SERVICE;
      fetchMock.mockResolvedValue({
        ...actionTypeExecutorResult,
        status: 'error',
      });
      await expect(
        pushToService(connectorId, casePushParams, abortCtrl.signal)
      ).rejects.toMatchObject({ message: theError });
    });
  });
});
