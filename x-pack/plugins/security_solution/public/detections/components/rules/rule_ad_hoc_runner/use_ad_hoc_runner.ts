/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import type { Rule } from '../../../../detection_engine/rule_management/logic/types';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { AdHocRunResponse } from '../../../../../common/detection_engine/rule_schema';

import { adHocRunRule } from '../../../../detection_engine/rule_management/api/api';
import type { TimeframePreviewOptions } from '../../../pages/detection_engine/rules/types';
import { usePreviewInvocationCount } from '../rule_preview/use_preview_invocation_count';
import { RULE_AD_HOC_ERROR } from './translations';

const emptyPreviewRule: AdHocRunResponse = {
  adHocRunId: undefined,
  executionId: undefined,
  initialInvocationCount: 0,
  logs: [],
  isAborted: false,
};

export const useAdHocRunner = ({
  rule,
  timeframeOptions,
  isRequestTriggered,
}: {
  rule: Rule;
  timeframeOptions: TimeframePreviewOptions;
  isRequestTriggered: boolean;
}) => {
  const [response, setResponse] = useState<AdHocRunResponse>(emptyPreviewRule);
  const [isLoading, setIsLoading] = useState(false);
  const { addError } = useAppToasts();
  const { invocationCount, interval, from } = usePreviewInvocationCount({ timeframeOptions });

  const timeframeStart = useMemo(
    () => timeframeOptions.timeframeStart.toISOString(),
    [timeframeOptions]
  );
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
    const createAdHocRunId = async () => {
      if (rule && isRequestTriggered) {
        try {
          setIsLoading(true);
          const adHocRunResponse = await adHocRunRule({
            rule: {
              ruleId: rule.id,
              timeframeStart,
              timeframeEnd,
              interval: rule.interval,
            },
            signal: abortCtrl.signal,
          });
          if (isSubscribed) {
            setResponse(adHocRunResponse);
          }
        } catch (error) {
          if (isSubscribed) {
            addError(error, { title: RULE_AD_HOC_ERROR });
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    createAdHocRunId();
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
    timeframeStart,
    isRequestTriggered,
  ]);

  return { isLoading, response };
};
