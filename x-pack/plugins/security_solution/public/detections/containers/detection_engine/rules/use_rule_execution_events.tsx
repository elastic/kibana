/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useQuery } from 'react-query';
import {
  AggregateRuleExecutionEvent,
  RuleExecutionStatus,
} from '../../../../../common/detection_engine/schemas/common';
import { GetAggregateRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchRuleExecutionEvents } from './api';
import * as i18n from './translations';

interface UseRuleExecutionEventsArgs {
  ruleId: string;
  start: string;
  end: string;
  queryText?: string;
  statusFilters?: RuleExecutionStatus[];
  page?: number;
  perPage?: number;
  sortField?: keyof AggregateRuleExecutionEvent;
  sortOrder?: SortOrder;
}

export const useRuleExecutionEvents = ({
  ruleId,
  start,
  end,
  queryText,
  statusFilters,
  page,
  perPage,
  sortField,
  sortOrder,
}: UseRuleExecutionEventsArgs) => {
  const { addError } = useAppToasts();

  return useQuery<GetAggregateRuleExecutionEventsResponse>(
    [
      'ruleExecutionEvents',
      {
        ruleId,
        start,
        end,
        queryText,
        statusFilters,
        page,
        perPage,
        sortField,
        sortOrder,
      },
    ],
    async ({ signal }) => {
      return fetchRuleExecutionEvents({
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
      });
    },
    {
      onError: (e) => {
        addError(e, { title: i18n.RULE_EXECUTION_EVENTS_FETCH_FAILURE });
      },
    }
  );
};
