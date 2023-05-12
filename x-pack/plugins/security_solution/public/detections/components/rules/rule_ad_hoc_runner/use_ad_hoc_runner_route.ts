/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import type { Rule } from '../../../../detection_engine/rule_management/logic';
import { useAdHocRunner } from './use_ad_hoc_runner';
import type { RulePreviewLogs } from '../../../../../common/detection_engine/rule_schema';
import type { TimeframePreviewOptions } from '../../../pages/detection_engine/rules/types';

interface AdHocRunnerRouteParams {
  rule: Rule;
  timeframeOptions: TimeframePreviewOptions;
}

export const useAdHocRunnerRoute = ({ rule, timeframeOptions }: AdHocRunnerRouteParams) => {
  const [isRequestTriggered, setIsRequestTriggered] = useState(false);

  const { isLoading, response } = useAdHocRunner({
    rule,
    timeframeOptions,
    isRequestTriggered,
  });
  const [logs, setLogs] = useState<RulePreviewLogs[]>(response.logs ?? []);
  const [isAborted, setIsAborted] = useState<boolean>(!!response.isAborted);
  const [hasNoiseWarning, setHasNoiseWarning] = useState<boolean>(false);

  useEffect(() => {
    setLogs(response.logs ?? []);
    setIsAborted(!!response.isAborted);
  }, [response]);

  const addNoiseWarning = useCallback(() => {
    setHasNoiseWarning(true);
  }, [setHasNoiseWarning]);

  const clearAdHocRun = useCallback(() => {
    setLogs([]);
    setIsAborted(false);
    setIsRequestTriggered(false);
    setHasNoiseWarning(false);
  }, []);

  useEffect(() => {
    clearAdHocRun();
  }, [clearAdHocRun]);

  return {
    hasNoiseWarning,
    addNoiseWarning,
    createAdHocRun: () => setIsRequestTriggered(true),
    clearAdHocRun,
    isAdHocRunRequestInProgress: isLoading,
    adHocRunId: response.adHocRunId ?? '',
    executionId: response.executionId ?? '',
    logs,
    isAborted,
  };
};
