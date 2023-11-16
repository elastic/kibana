/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import type { GetRuleExecutionResultsResponse } from '../../../../../common/api/detection_engine/rule_monitoring';
import type { FetchRuleExecutionResultsArgs } from '../../api';
import { api } from '../../api';

import * as i18n from './translations';

export type UseExecutionResultsArgs = Omit<FetchRuleExecutionResultsArgs, 'signal'>;

export const useExecutionResults = (args: UseExecutionResultsArgs) => {
  const { addError } = useAppToasts();

  return useQuery<GetRuleExecutionResultsResponse>(
    ['detectionEngine', 'ruleMonitoring', 'executionResults', args],
    ({ signal }) => {
      return api.fetchRuleExecutionResults({ ...args, signal });
    },
    {
      keepPreviousData: true,
      onError: (e) => {
        addError(e, { title: i18n.FETCH_ERROR });
      },
    }
  );
};
