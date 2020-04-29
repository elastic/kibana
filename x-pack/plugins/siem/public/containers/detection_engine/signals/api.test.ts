/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../lib/kibana';
import {
  signalsMock,
  mockSignalsQuery,
  mockStatusSignalQuery,
  mockSignalIndex,
  mockUserPrivilege,
} from './mock';
import {
  fetchQuerySignals,
  updateSignalStatus,
  getSignalIndex,
  getUserPrivilege,
  createSignalIndex,
} from './api';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Detections Signals API', () => {
  describe('fetchQuerySignals', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(signalsMock);
    });

    test('check parameter url, body', async () => {
      await fetchQuerySignals({ query: mockSignalsQuery, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/signals/search', {
        body:
          '{"aggs":{"signalsByGrouping":{"terms":{"field":"signal.rule.risk_score","missing":"All others","order":{"_count":"desc"},"size":10},"aggs":{"signals":{"date_histogram":{"field":"@timestamp","fixed_interval":"81000000ms","min_doc_count":0,"extended_bounds":{"min":1579644343954,"max":1582236343955}}}}}},"query":{"bool":{"filter":[{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}},{"range":{"@timestamp":{"gte":1579644343954,"lte":1582236343955}}}]}}}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const signalsResp = await fetchQuerySignals({
        query: mockSignalsQuery,
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(signalsMock);
    });
  });

  describe('updateSignalStatus', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue({});
    });

    test('check parameter url, body when closing a signal', async () => {
      await updateSignalStatus({
        query: mockStatusSignalQuery,
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

    test('check parameter url, body when opening a signal', async () => {
      await updateSignalStatus({
        query: mockStatusSignalQuery,
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
      const signalsResp = await updateSignalStatus({
        query: mockStatusSignalQuery,
        signal: abortCtrl.signal,
        status: 'open',
      });
      expect(signalsResp).toEqual({});
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
      const signalsResp = await getSignalIndex({
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(mockSignalIndex);
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
      const signalsResp = await getUserPrivilege({
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(mockUserPrivilege);
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
      const signalsResp = await createSignalIndex({
        signal: abortCtrl.signal,
      });
      expect(signalsResp).toEqual(mockSignalIndex);
    });
  });
});
