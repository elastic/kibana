/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import { RuleRunTypeEnum } from '../../../../../common/api/detection_engine/rule_monitoring';
import type { GetRuleExecutionResultsResponse } from '../../../../../common/api/detection_engine/rule_monitoring';
import type { FetchRuleExecutionResultsArgs } from '../../api';
import { api } from '../../api';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import * as i18n from './translations';

export type UseExecutionResultsArgs = Omit<FetchRuleExecutionResultsArgs, 'signal'>;

export const useExecutionResults = (args: UseExecutionResultsArgs) => {
  const { addError } = useAppToasts();
  const isManualRuleRunEnabled = useIsExperimentalFeatureEnabled('manualRuleRunEnabled');

  return useQuery<GetRuleExecutionResultsResponse>(
    ['detectionEngine', 'ruleMonitoring', 'executionResults', args],
    ({ signal }) => {
      let runTypeFilters = args.runTypeFilters;

      // if manual rule run is disabled, only show standard runs
      if (!isManualRuleRunEnabled) {
        runTypeFilters = [RuleRunTypeEnum.standard];
      }

      return api.fetchRuleExecutionResults({ ...args, runTypeFilters, signal });
    },
    {
      keepPreviousData: true,
      onError: (e) => {
        addError(e, { title: i18n.FETCH_ERROR });
      },
    }
  );
};
