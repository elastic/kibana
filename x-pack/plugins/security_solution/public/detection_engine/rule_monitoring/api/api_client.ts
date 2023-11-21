/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, isUndefined } from 'lodash';
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
    const {
      ruleId,
      searchTerm,
      eventTypes,
      logLevels,
      dateRange,
      sortOrder,
      page,
      perPage,
      signal,
    } = args;

    const url = getRuleExecutionEventsUrl(ruleId);
    const startDate = dateMath.parse(dateRange?.start ?? '')?.toISOString();
    const endDate = dateMath.parse(dateRange?.end ?? '', { roundUp: true })?.toISOString();

    return http().fetch<GetRuleExecutionEventsResponse>(url, {
      method: 'GET',
      version: '1',
      query: omitBy(
        {
          search_term: searchTerm?.length ? searchTerm : undefined,
          event_types: eventTypes?.length ? eventTypes.join(',') : undefined,
          log_levels: logLevels?.length ? logLevels.join(',') : undefined,
          date_start: startDate,
          date_end: endDate,
          sort_order: sortOrder,
          page,
          per_page: perPage,
        },
        isUndefined
      ),
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
