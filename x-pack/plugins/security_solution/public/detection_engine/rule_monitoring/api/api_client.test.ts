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
} from '../../../../common/api/detection_engine/rule_monitoring';
import {
  LogLevelEnum,
  RuleExecutionEventTypeEnum,
} from '../../../../common/api/detection_engine/rule_monitoring';

import { api } from './api_client';
import type { FetchRuleExecutionEventsArgs } from './api_client_interface';

jest.mock('../../../common/lib/kibana');

describe('Rule Monitoring API Client', () => {
  const fetchMock = jest.fn();
  const mockKibanaServices = KibanaServices.get as jest.Mock;
  mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

  describe('setupDetectionEngineHealthApi', () => {
    const responseMock = {};

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(responseMock);
    });

    it('calls API with correct parameters', async () => {
      await api.setupDetectionEngineHealthApi();

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/health/_setup',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

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
      await api.fetchRuleExecutionEvents({ ruleId: '42' });

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/rules/42/execution/events',
        expect.objectContaining({
          method: 'GET',
          query: {},
        })
      );
    });

    const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    it.each<[string, Omit<FetchRuleExecutionEventsArgs, 'ruleId'>, Record<string, unknown>]>([
      [
        'search term filter',
        { searchTerm: 'something to search' },
        { search_term: 'something to search' },
      ],
      [
        'event types filter',
        { eventTypes: [RuleExecutionEventTypeEnum.message] },
        { event_types: 'message' },
      ],
      [
        'log level filter',
        { logLevels: [LogLevelEnum.warn, LogLevelEnum.error] },
        { log_levels: 'warn,error' },
      ],
      [
        'start date filter in relative format',
        { dateRange: { start: 'now-1d/d' } },
        { date_start: expect.stringMatching(ISO_PATTERN) },
      ],
      [
        'end date filter',
        { dateRange: { end: 'now-3d/d' } },
        { date_end: expect.stringMatching(ISO_PATTERN) },
      ],
      [
        'date range filter in relative format',
        { dateRange: { start: new Date().toISOString(), end: new Date().toISOString() } },
        {
          date_start: expect.stringMatching(ISO_PATTERN),
          date_end: expect.stringMatching(ISO_PATTERN),
        },
      ],
      [
        'pagination',
        { sortOrder: 'asc', page: 42, perPage: 146 } as const,
        { sort_order: 'asc', page: 42, per_page: 146 },
      ],
    ])('calls API correctly with %s', async (_, params, expectedParams) => {
      await api.fetchRuleExecutionEvents({
        ruleId: '42',
        ...params,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/rules/42/execution/events',
        expect.objectContaining({
          method: 'GET',
          query: {
            ...expectedParams,
          },
        })
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
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/internal/detection_engine/rules/42/execution/results',
        expect.objectContaining({
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
        })
      );
    });

    it('returns API response as is', async () => {
      const response = await api.fetchRuleExecutionResults({
        ruleId: '42',
        start: 'now-30',
        end: 'now',
        queryText: '',
        statusFilters: [],
      });
      expect(response).toEqual(responseMock);
    });
  });
});
