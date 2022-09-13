/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import moment from 'moment';
import type { Unit } from '@kbn/datemath';
import type { Type, ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import type { FieldValueQueryBar } from '../query_bar';
import { usePreviewRule } from '../../../containers/detection_engine/rules/use_preview_rule';
import { formatPreviewRule } from '../../../pages/detection_engine/rules/create/helpers';
import type { FieldValueThreshold } from '../threshold_input';
import type { RulePreviewLogs } from '../../../../../common/detection_engine/schemas/request';
import type { EqlOptionsSelected } from '../../../../../common/search_strategy';
import type {
  AdvancedPreviewOptions,
  DataSourceType,
} from '../../../pages/detection_engine/rules/types';

interface PreviewRouteParams {
  isDisabled: boolean;
  index: string[];
  dataViewId?: string;
  dataSourceType: DataSourceType;
  threatIndex: string[];
  query: FieldValueQueryBar;
  threatQuery: FieldValueQueryBar;
  ruleType: Type;
  timeFrame: Unit;
  threatMapping: ThreatMapping;
  threshold: FieldValueThreshold;
  machineLearningJobId: string[];
  anomalyThreshold: number;
  eqlOptions: EqlOptionsSelected;
  newTermsFields: string[];
  historyWindowSize: string;
  advancedOptions?: AdvancedPreviewOptions;
}

export const usePreviewRoute = ({
  index,
  dataViewId,
  dataSourceType,
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
  eqlOptions,
  newTermsFields,
  historyWindowSize,
  advancedOptions,
}: PreviewRouteParams) => {
  const [isRequestTriggered, setIsRequestTriggered] = useState(false);

  const [timeframeEnd, setTimeframeEnd] = useState(moment());
  useEffect(() => {
    if (isRequestTriggered) {
      setTimeframeEnd(moment());
    }
  }, [isRequestTriggered, setTimeframeEnd]);

  const quickQueryOptions = useMemo(
    () => ({
      timeframe: timeFrame,
      timeframeEnd,
    }),
    [timeFrame, timeframeEnd]
  );

  const { isLoading, showInvocationCountWarning, response, rule, setRule } = usePreviewRule({
    quickQueryOptions,
    advancedOptions,
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
    eqlOptions,
    newTermsFields,
    historyWindowSize,
    advancedOptions,
  ]);

  useEffect(() => {
    if (isRequestTriggered && rule === null) {
      setRule(
        formatPreviewRule({
          index,
          dataViewId,
          dataSourceType,
          query,
          ruleType,
          threatIndex,
          threatMapping,
          threatQuery,
          timeFrame,
          threshold,
          machineLearningJobId,
          anomalyThreshold,
          eqlOptions,
          newTermsFields,
          historyWindowSize,
          advancedOptions,
        })
      );
    }
  }, [
    index,
    dataViewId,
    dataSourceType,
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
    eqlOptions,
    newTermsFields,
    historyWindowSize,
    advancedOptions,
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
    showInvocationCountWarning,
  };
};
