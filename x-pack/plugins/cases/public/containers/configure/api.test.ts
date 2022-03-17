/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fetchConnectors,
  getCaseConfigure,
  postCaseConfigure,
  patchCaseConfigure,
  fetchActionTypes,
} from './api';
import {
  caseConfigurationMock,
  caseConfigurationResposeMock,
  caseConfigurationCamelCaseResponseMock,
} from './mock';
import { ConnectorTypes } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { KibanaServices } from '../../common/lib/kibana';
import { actionTypesMock, connectorsMock } from '../../common/mock/connectors';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Case Configuration API', () => {
  describe('fetch connectors', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(connectorsMock);
    });

    test('check url, method, signal', async () => {
      await fetchConnectors({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure/connectors/_find', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await fetchConnectors({ signal: abortCtrl.signal });
      expect(resp).toEqual(connectorsMock);
    });
  });

  describe('fetch configuration', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue([caseConfigurationResposeMock]);
    });

    test('check url, method, signal', async () => {
      await getCaseConfigure({ signal: abortCtrl.signal, owner: [SECURITY_SOLUTION_OWNER] });
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure', {
        method: 'GET',
        signal: abortCtrl.signal,
        query: {
          owner: [SECURITY_SOLUTION_OWNER],
        },
      });
    });

    test('happy path', async () => {
      const resp = await getCaseConfigure({
        signal: abortCtrl.signal,
        owner: [SECURITY_SOLUTION_OWNER],
      });
      expect(resp).toEqual(caseConfigurationCamelCaseResponseMock);
    });

    test('return null on empty response', async () => {
      fetchMock.mockResolvedValue({});
      const resp = await getCaseConfigure({
        signal: abortCtrl.signal,
        owner: [SECURITY_SOLUTION_OWNER],
      });
      expect(resp).toBe(null);
    });
  });

  describe('create configuration', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(caseConfigurationResposeMock);
    });

    test('check url, body, method, signal', async () => {
      await postCaseConfigure(caseConfigurationMock, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure', {
        body: '{"connector":{"id":"123","name":"My connector","type":".jira","fields":null},"owner":"securitySolution","closure_type":"close-by-user"}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await postCaseConfigure(caseConfigurationMock, abortCtrl.signal);
      expect(resp).toEqual(caseConfigurationCamelCaseResponseMock);
    });
  });

  describe('update configuration', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(caseConfigurationResposeMock);
    });

    test('check url, body, method, signal', async () => {
      await patchCaseConfigure(
        '123',
        {
          connector: { id: '456', name: 'My Connector 2', type: ConnectorTypes.none, fields: null },
          version: 'WzHJ12',
        },
        abortCtrl.signal
      );
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure/123', {
        body: '{"connector":{"id":"456","name":"My Connector 2","type":".none","fields":null},"version":"WzHJ12"}',
        method: 'PATCH',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await patchCaseConfigure(
        '123',
        {
          connector: { id: '456', name: 'My Connector 2', type: ConnectorTypes.none, fields: null },
          version: 'WzHJ12',
        },
        abortCtrl.signal
      );
      expect(resp).toEqual(caseConfigurationCamelCaseResponseMock);
    });
  });

  describe('fetch actionTypes', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(actionTypesMock);
    });

    test('check url, method, signal', async () => {
      await fetchActionTypes({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/actions/connector_types', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await fetchActionTypes({ signal: abortCtrl.signal });
      expect(resp).toEqual(actionTypesMock);
    });
  });
});
