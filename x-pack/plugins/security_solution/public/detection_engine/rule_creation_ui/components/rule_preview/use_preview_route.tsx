/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';
import type { List } from '@kbn/securitysolution-io-ts-list-types';
import { usePreviewRule } from './use_preview_rule';
import { formatPreviewRule } from '../../pages/rule_creation/helpers';
import type { RulePreviewLogs } from '../../../../../common/api/detection_engine';
import type {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  TimeframePreviewOptions,
} from '../../../../detections/pages/detection_engine/rules/types';
import { useKibana } from '../../../../common/lib/kibana';

interface PreviewRouteParams {
  defineRuleData?: DefineStepRule;
  aboutRuleData?: AboutStepRule;
  scheduleRuleData?: ScheduleStepRule;
  exceptionsList?: List[];
  timeframeOptions: TimeframePreviewOptions;
}

export const usePreviewRoute = ({
  defineRuleData,
  aboutRuleData,
  scheduleRuleData,
  exceptionsList,
  timeframeOptions,
}: PreviewRouteParams) => {
  const [isRequestTriggered, setIsRequestTriggered] = useState(false);

  const {
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;

  const { isLoading, response, rule, setRule } = usePreviewRule({
    timeframeOptions,
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
  }, [clearPreview, defineRuleData, aboutRuleData, scheduleRuleData]);

  useEffect(() => {
    if (!defineRuleData || !aboutRuleData || !scheduleRuleData) {
      return;
    }
    if (isRequestTriggered && rule === null) {
      setRule(
        formatPreviewRule({
          defineRuleData,
          aboutRuleData,
          scheduleRuleData,
          actionTypeRegistry,
          exceptionsList,
        })
      );
    }
  }, [
    isRequestTriggered,
    rule,
    setRule,
    defineRuleData,
    aboutRuleData,
    scheduleRuleData,
    exceptionsList,
    actionTypeRegistry,
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
