/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../common/lib/kibana';
import { fetchConnectors, getCaseConfigure, postCaseConfigure, patchCaseConfigure } from './api';
import {
  connectorsMock,
  caseConfigurationMock,
  caseConfigurationResposeMock,
  caseConfigurationCamelCaseResponseMock,
} from './mock';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../common/lib/kibana');

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
      fetchMock.mockResolvedValue(caseConfigurationResposeMock);
    });

    test('check url, method, signal', async () => {
      await getCaseConfigure({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await getCaseConfigure({ signal: abortCtrl.signal });
      expect(resp).toEqual(caseConfigurationCamelCaseResponseMock);
    });

    test('return null on empty response', async () => {
      fetchMock.mockResolvedValue({});
      const resp = await getCaseConfigure({ signal: abortCtrl.signal });
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
        body:
          '{"connector_id":"123","connector_name":"My Connector","closure_type":"close-by-user"}',
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
      await patchCaseConfigure({ connector_id: '456', version: 'WzHJ12' }, abortCtrl.signal);
      expect(fetchMock).toHaveBeenCalledWith('/api/cases/configure', {
        body: '{"connector_id":"456","version":"WzHJ12"}',
        method: 'PATCH',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const resp = await patchCaseConfigure(
        { connector_id: '456', version: 'WzHJ12' },
        abortCtrl.signal
      );
      expect(resp).toEqual(caseConfigurationCamelCaseResponseMock);
    });
  });
});
