/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../common/lib/kibana';

import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
} from '../../../../common/detection_engine/rule_monitoring';
import {
  LogLevel,
  RuleExecutionEventType,
} from '../../../../common/detection_engine/rule_monitoring';

import { api } from './api_client';

jest.mock('../../../common/lib/kibana');

describe('Rule Monitoring API Client', () => {
  const fetchMock = jest.fn();
  const mockKibanaServices = KibanaServices.get as jest.Mock;
  mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

  const signal = new AbortController().signal;

  describe('fetchRuleExecutionEvents', () => {
    const responseMock: GetRuleExecutionEventsResponse = {
      events: [],
      pagination: {
        page: 1,
        per_page: 20,
        total: 0,
      },
    };

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(responseMock);
    });

    it('calls API correctly with only rule id specified', async () => {
      await api.fetchRuleExecutionEvents({ ruleId: '42', signal });

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/rules/42/execution/events',
        {
          method: 'GET',
          query: {},
          signal,
        }
      );
    });

    it('calls API correctly with filter and pagination options', async () => {
      await api.fetchRuleExecutionEvents({
        ruleId: '42',
        eventTypes: [RuleExecutionEventType.message],
        logLevels: [LogLevel.warn, LogLevel.error],
        sortOrder: 'asc',
        page: 42,
        perPage: 146,
        signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/rules/42/execution/events',
        {
          method: 'GET',
          query: {
            event_types: 'message',
            log_levels: 'warn,error',
            sort_order: 'asc',
            page: 42,
            per_page: 146,
          },
          signal,
        }
      );
    });
  });

  describe('fetchRuleExecutionResults', () => {
    const responseMock: GetRuleExecutionResultsResponse = {
      events: [],
      total: 0,
    };

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(responseMock);
    });

    it('calls API with correct parameters', async () => {
      await api.fetchRuleExecutionResults({
        ruleId: '42',
        start: '2001-01-01T17:00:00.000Z',
        end: '2001-01-02T17:00:00.000Z',
        queryText: '',
        statusFilters: [],
        signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/rules/42/execution/results',
        {
          method: 'GET',
          query: {
            end: '2001-01-02T17:00:00.000Z',
            page: undefined,
            per_page: undefined,
            query_text: '',
            sort_field: undefined,
            sort_order: undefined,
            start: '2001-01-01T17:00:00.000Z',
            status_filters: '',
          },
          signal,
        }
      );
    });

    it('returns API response as is', async () => {
      const response = await api.fetchRuleExecutionResults({
        ruleId: '42',
        start: 'now-30',
        end: 'now',
        queryText: '',
        statusFilters: [],
        signal,
      });
      expect(response).toEqual(responseMock);
    });
  });
});
