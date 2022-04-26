/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import { Unit } from '@kbn/datemath';
import { Type, ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import { FieldValueQueryBar } from '../query_bar';
import { usePreviewRule } from '../../../containers/detection_engine/rules/use_preview_rule';
import { formatPreviewRule } from '../../../pages/detection_engine/rules/create/helpers';
import { FieldValueThreshold } from '../threshold_input';
import { RulePreviewLogs } from '../../../../../common/detection_engine/schemas/request';

interface PreviewRouteParams {
  isDisabled: boolean;
  index: string[];
  threatIndex: string[];
  query: FieldValueQueryBar;
  threatQuery: FieldValueQueryBar;
  ruleType: Type;
  timeFrame: Unit;
  threatMapping: ThreatMapping;
  threshold: FieldValueThreshold;
  machineLearningJobId: string[];
  anomalyThreshold: number;
}

export const usePreviewRoute = ({
  index,
  isDisabled,
  query,
  threatIndex,
  threatQuery,
  timeFrame,
  ruleType,
  threatMapping,
  threshold,
  machineLearningJobId,
  anomalyThreshold,
}: PreviewRouteParams) => {
  const [isRequestTriggered, setIsRequestTriggered] = useState(false);

  const { isLoading, response, rule, setRule } = usePreviewRule(timeFrame);
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

  const clearPreview = useCallback(() => {
    setRule(null);
    setLogs([]);
    setIsAborted(false);
    setIsRequestTriggered(false);
    setHasNoiseWarning(false);
  }, [setRule]);

  useEffect(() => {
    clearPreview();
  }, [
    clearPreview,
    index,
    isDisabled,
    query,
    threatIndex,
    threatQuery,
    timeFrame,
    ruleType,
    threatMapping,
    threshold,
    machineLearningJobId,
    anomalyThreshold,
  ]);

  useEffect(() => {
    if (isRequestTriggered && rule === null) {
      setRule(
        formatPreviewRule({
          index,
          query,
          ruleType,
          threatIndex,
          threatMapping,
          threatQuery,
          timeFrame,
          threshold,
          machineLearningJobId,
          anomalyThreshold,
        })
      );
    }
  }, [
    index,
    isRequestTriggered,
    query,
    rule,
    ruleType,
    setRule,
    threatIndex,
    threatMapping,
    threatQuery,
    timeFrame,
    threshold,
    machineLearningJobId,
    anomalyThreshold,
  ]);

  return {
    hasNoiseWarning,
    addNoiseWarning,
    createPreview: () => setIsRequestTriggered(true),
    clearPreview,
    isPreviewRequestInProgress: isLoading,
    previewId: response.previewId ?? '',
    logs,
    isAborted,
  };
};
