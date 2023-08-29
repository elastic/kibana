/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

import { KibanaServices } from '../../../common/lib/kibana';

import type {
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
} from '../../../../common/api/detection_engine/rule_monitoring';
import {
  getRuleExecutionEventsUrl,
  getRuleExecutionResultsUrl,
  SETUP_HEALTH_URL,
} from '../../../../common/api/detection_engine/rule_monitoring';

import type {
  FetchRuleExecutionEventsArgs,
  FetchRuleExecutionResultsArgs,
  IRuleMonitoringApiClient,
} from './api_client_interface';

export const api: IRuleMonitoringApiClient = {
  setupDetectionEngineHealthApi: async (): Promise<void> => {
    await http().fetch(SETUP_HEALTH_URL, {
      version: '1',
      method: 'POST',
    });
  },

  fetchRuleExecutionEvents: (
    args: FetchRuleExecutionEventsArgs
  ): Promise<GetRuleExecutionEventsResponse> => {
    const { ruleId, eventTypes, logLevels, sortOrder, page, perPage, signal } = args;

    const url = getRuleExecutionEventsUrl(ruleId);

    return http().fetch<GetRuleExecutionEventsResponse>(url, {
      method: 'GET',
      version: '1',
      query: {
        event_types: eventTypes?.join(','),
        log_levels: logLevels?.join(','),
        sort_order: sortOrder,
        page,
        per_page: perPage,
      },
      signal,
    });
  },

  fetchRuleExecutionResults: (
    args: FetchRuleExecutionResultsArgs
  ): Promise<GetRuleExecutionResultsResponse> => {
    const {
      ruleId,
      start,
      end,
      queryText,
      statusFilters,
      page,
      perPage,
      sortField,
      sortOrder,
      signal,
    } = args;

    const url = getRuleExecutionResultsUrl(ruleId);
    const startDate = dateMath.parse(start);
    const endDate = dateMath.parse(end, { roundUp: true });

    return http().fetch<GetRuleExecutionResultsResponse>(url, {
      method: 'GET',
      version: '1',
      query: {
        start: startDate?.utc().toISOString(),
        end: endDate?.utc().toISOString(),
        query_text: queryText,
        status_filters: statusFilters?.sort()?.join(','),
        sort_field: sortField,
        sort_order: sortOrder,
        page,
        per_page: perPage,
      },
      signal,
    });
  },
};

const http = () => KibanaServices.get().http;
