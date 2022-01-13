/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../../common/lib/kibana';
import {
  alertsMock,
  mockAlertsQuery,
  mockStatusAlertQuery,
  mockSignalIndex,
  mockUserPrivilege,
  mockHostIsolation,
} from './mock';
import {
  fetchQueryAlerts,
  updateAlertStatus,
  getSignalIndex,
  getUserPrivilege,
  createSignalIndex,
  createHostIsolation,
} from './api';
import { coreMock } from '../../../../../../../../src/core/public/mocks';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../../common/lib/kibana');

const coreStartMock = coreMock.createStart({ basePath: '/mock' });
mockKibanaServices.mockReturnValue(coreStartMock);
const fetchMock = coreStartMock.http.fetch;

describe('Detections Alerts API', () => {
  describe('fetchQueryAlerts', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(alertsMock);
    });

    test('check parameter url, body', async () => {
      await fetchQueryAlerts({ query: mockAlertsQuery, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/search', {
        body: '{"aggs":{"alertsByGrouping":{"terms":{"field":"signal.rule.risk_score","missing":"All others","order":{"_count":"desc"},"size":10},"aggs":{"alerts":{"date_histogram":{"field":"@timestamp","fixed_interval":"81000000ms","min_doc_count":0,"extended_bounds":{"min":1579644343954,"max":1582236343955}}}}}},"query":{"bool":{"filter":[{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}},{"range":{"@timestamp":{"gte":1579644343954,"lte":1582236343955}}}]}}}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const signalsResp = await fetchQueryAlerts({
        query: mockAlertsQuery,
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(alertsMock);
    });
  });

  describe('updateAlertStatus', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue({});
    });

    test('check parameter url, body when closing an alert', async () => {
      await updateAlertStatus({
        query: mockStatusAlertQuery,
        signal: abortCtrl.signal,
        status: 'closed',
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/status', {
        body: '{"conflicts":"proceed","status":"closed","bool":{"filter":{"terms":{"_id":["b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5"]}}}}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, body when opening an alert', async () => {
      await updateAlertStatus({
        query: mockStatusAlertQuery,
        signal: abortCtrl.signal,
        status: 'open',
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/status', {
        body: '{"conflicts":"proceed","status":"open","bool":{"filter":{"terms":{"_id":["b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5"]}}}}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const alertsResp = await updateAlertStatus({
        query: mockStatusAlertQuery,
        signal: abortCtrl.signal,
        status: 'open',
      });
      expect(alertsResp).toEqual({});
    });
  });

  describe('getSignalIndex', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockSignalIndex);
    });

    test('check parameter url', async () => {
      await getSignalIndex({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/index', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const alertsResp = await getSignalIndex({
        signal: abortCtrl.signal,
      });
      expect(alertsResp).toEqual(mockSignalIndex);
    });
  });

  describe('getUserPrivilege', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockUserPrivilege);
    });

    test('check parameter url', async () => {
      await getUserPrivilege({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/privileges', {
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const alertsResp = await getUserPrivilege({
        signal: abortCtrl.signal,
      });
      expect(alertsResp).toEqual(mockUserPrivilege);
    });
  });

  describe('createSignalIndex', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(mockSignalIndex);
    });

    test('check parameter url', async () => {
      await createSignalIndex({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/index', {
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const alertsResp = await createSignalIndex({
        signal: abortCtrl.signal,
      });
      expect(alertsResp).toEqual(mockSignalIndex);
    });
  });

  describe('createHostIsolation', () => {
    const postMock = coreStartMock.http.post;

    beforeEach(() => {
      postMock.mockClear();
      postMock.mockResolvedValue(mockHostIsolation);
    });

    test('check parameter url', async () => {
      await createHostIsolation({
        endpointId: 'fd8a122b-4c54-4c05-b295-e5f8381fc59d',
        comment: 'commento',
        caseIds: ['88c04a90-b19c-11eb-b838-bf3c7840b969'],
      });
      expect(postMock).toHaveBeenCalledWith('/api/endpoint/isolate', {
        body: '{"endpoint_ids":["fd8a122b-4c54-4c05-b295-e5f8381fc59d"],"comment":"commento","case_ids":["88c04a90-b19c-11eb-b838-bf3c7840b969"]}',
      });
    });

    test('happy path', async () => {
      const hostIsolationResponse = await createHostIsolation({
        endpointId: 'fd8a122b-4c54-4c05-b295-e5f8381fc59d',
        comment: 'commento',
        caseIds: ['88c04a90-b19c-11eb-b838-bf3c7840b969'],
      });
      expect(hostIsolationResponse).toEqual(mockHostIsolation);
    });
  });
});
