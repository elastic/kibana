/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToastsApi } from 'kibana/public';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rule, RuleSummary, RuleType } from '../../../../types';
import {
  ComponentOpts as RuleApis,
  withBulkRuleOperations,
} from '../../common/components/with_bulk_rule_api_operations';
import { RuleWithApi as Rules } from './rule';
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';

type WithRuleSummaryProps = {
  rule: Rule;
  ruleType: RuleType;
  readOnly: boolean;
  requestRefresh: () => Promise<void>;
  refreshToken?: number;
} & Pick<RuleApis, 'loadRuleSummary'>;

export const RuleRoute: React.FunctionComponent<WithRuleSummaryProps> = ({
  rule,
  ruleType,
  readOnly,
  requestRefresh,
  loadRuleSummary: loadRuleSummary,
  refreshToken,
}) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [ruleSummary, setRuleSummary] = useState<RuleSummary | null>(null);
  const [numberOfExecutions, setNumberOfExecutions] = useState(60);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const ruleID = useRef<string | null>(null);
  const refreshTokenRef = useRef(refreshToken);

  const getRuleSummaryWithLoadingState = useCallback(
    async (executions: number = numberOfExecutions) => {
      setIsLoadingChart(true);
      await getRuleSummary(ruleID.current!, loadRuleSummary, setRuleSummary, toasts, executions);
      setIsLoadingChart(false);
    },
    [setIsLoadingChart, ruleID, loadRuleSummary, setRuleSummary, toasts, numberOfExecutions]
  );

  useEffect(() => {
    if (ruleID.current !== rule.id) {
      ruleID.current = rule.id;
      getRuleSummaryWithLoadingState();
    }
  }, [rule, ruleID, getRuleSummaryWithLoadingState]);

  useEffect(() => {
    if (refreshTokenRef.current !== refreshToken) {
      refreshTokenRef.current = refreshToken;
      getRuleSummaryWithLoadingState();
    }
  }, [refreshToken, refreshTokenRef, getRuleSummaryWithLoadingState]);

  const onChangeDuration = useCallback(
    (executions: number) => {
      setNumberOfExecutions(executions);
      getRuleSummaryWithLoadingState(executions);
    },
    [getRuleSummaryWithLoadingState]
  );

  return ruleSummary ? (
    <Rules
      requestRefresh={requestRefresh}
      refreshToken={refreshToken}
      rule={rule}
      ruleType={ruleType}
      readOnly={readOnly}
      ruleSummary={ruleSummary}
      numberOfExecutions={numberOfExecutions}
      isLoadingChart={isLoadingChart}
      onChangeDuration={onChangeDuration}
    />
  ) : (
    <CenterJustifiedSpinner />
  );
};

export async function getRuleSummary(
  ruleId: string,
  loadRuleSummary: RuleApis['loadRuleSummary'],
  setRuleSummary: React.Dispatch<React.SetStateAction<RuleSummary | null>>,
  toasts: Pick<ToastsApi, 'addDanger'>,
  executionDuration?: number
) {
  try {
    const loadedSummary = await loadRuleSummary(ruleId, executionDuration);
    setRuleSummary(loadedSummary);
  } catch (e) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.triggersActionsUI.sections.ruleDetails.unableToLoadRulesMessage',
        {
          defaultMessage: 'Unable to load rules: {message}',
          values: {
            message: e.message,
          },
        }
      ),
    });
  }
}

export const RuleRouteWithApi = withBulkRuleOperations(RuleRoute);
