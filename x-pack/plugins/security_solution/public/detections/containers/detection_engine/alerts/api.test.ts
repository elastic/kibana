/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../../common/lib/kibana';
import {
  alertsMock,
  mockAlertsQuery,
  mockStatusAlertQuery,
  mockSignalIndex,
  mockUserPrivilege,
} from './mock';
import {
  fetchQueryAlerts,
  updateAlertStatus,
  getSignalIndex,
  getUserPrivilege,
  createSignalIndex,
} from './api';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Detections Alerts API', () => {
  describe('fetchQueryAlerts', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(alertsMock);
    });

    test('check parameter url, body', async () => {
      await fetchQueryAlerts({ query: mockAlertsQuery, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/search', {
        body:
          '{"aggs":{"alertsByGrouping":{"terms":{"field":"signal.rule.risk_score","missing":"All others","order":{"_count":"desc"},"size":10},"aggs":{"alerts":{"date_histogram":{"field":"@timestamp","fixed_interval":"81000000ms","min_doc_count":0,"extended_bounds":{"min":1579644343954,"max":1582236343955}}}}}},"query":{"bool":{"filter":[{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}},{"range":{"@timestamp":{"gte":1579644343954,"lte":1582236343955}}}]}}}',
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
        body:
          '{"status":"closed","bool":{"filter":{"terms":{"_id":["b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5"]}}}}',
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
        body:
          '{"status":"open","bool":{"filter":{"terms":{"_id":["b4ee5c32e3a321057edcc953ca17228c6fdfe5ba43fdbbdaffa8cefa11605cc5"]}}}}',
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
});
