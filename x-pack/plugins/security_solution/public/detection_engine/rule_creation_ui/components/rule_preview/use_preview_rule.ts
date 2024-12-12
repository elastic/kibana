/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type {
  RuleCreateProps,
  RulePreviewResponse,
} from '../../../../../common/api/detection_engine';
import { useKibana } from '../../../../common/lib/kibana';
import { previewRule } from '../../../rule_management/api/api';
import { transformOutput } from '../../../../detections/containers/detection_engine/rules/transforms';
import type { TimeframePreviewOptions } from '../../../../detections/pages/detection_engine/rules/types';
import { usePreviewInvocationCount } from './use_preview_invocation_count';
import * as i18n from './translations';
import { PreviewRuleEventTypes } from '../../../../common/lib/telemetry';

const emptyPreviewRule: RulePreviewResponse = {
  previewId: undefined,
  logs: [],
  isAborted: false,
};

export const usePreviewRule = ({
  timeframeOptions,
  enableLoggedRequests,
}: {
  timeframeOptions: TimeframePreviewOptions;
  enableLoggedRequests?: boolean;
}) => {
  const [rule, setRule] = useState<RuleCreateProps | null>(null);
  const [response, setResponse] = useState<RulePreviewResponse>(emptyPreviewRule);
  const [isLoading, setIsLoading] = useState(false);
  const { addError } = useAppToasts();
  const { invocationCount, interval, from } = usePreviewInvocationCount({ timeframeOptions });
  const { telemetry } = useKibana().services;

  const timeframeEnd = useMemo(
    () => timeframeOptions.timeframeEnd.toISOString(),
    [timeframeOptions]
  );

  useEffect(() => {
    if (!rule) {
      setResponse(emptyPreviewRule);
      setIsLoading(false);
    }
  }, [rule]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setResponse(emptyPreviewRule);
    const createPreviewId = async () => {
      if (rule != null) {
        try {
          telemetry.reportEvent(PreviewRuleEventTypes.PreviewRule, {
            loggedRequestsEnabled: enableLoggedRequests ?? false,
            ruleType: rule.type,
          });
          setIsLoading(true);
          const previewRuleResponse = await previewRule({
            rule: {
              ...transformOutput({
                ...rule,
                interval,
                from,
              }),
              invocationCount,
              timeframeEnd,
            },
            enableLoggedRequests,
            signal: abortCtrl.signal,
          });
          if (isSubscribed) {
            setResponse(previewRuleResponse);
          }
        } catch (error) {
          if (isSubscribed) {
            addError(error, { title: i18n.RULE_PREVIEW_ERROR });
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    createPreviewId();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [
    rule,
    addError,
    invocationCount,
    from,
    interval,
    timeframeEnd,
    enableLoggedRequests,
    telemetry,
  ]);

  return { isLoading, response, rule, setRule };
};
