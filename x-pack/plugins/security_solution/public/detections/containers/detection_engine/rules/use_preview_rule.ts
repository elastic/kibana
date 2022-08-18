/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import {
  RULE_PREVIEW_FROM,
  RULE_PREVIEW_INTERVAL,
  RULE_PREVIEW_INVOCATION_COUNT,
} from '../../../../../common/detection_engine/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type {
  PreviewResponse,
  CreateRulesSchema,
} from '../../../../../common/detection_engine/schemas/request';

import { previewRule } from './api';
import * as i18n from './translations';
import { transformOutput } from './transforms';
import type {
  AdvancedPreviewOptions,
  QuickQueryPreviewOptions,
} from '../../../pages/detection_engine/rules/types';
import { getTimeTypeValue } from '../../../pages/detection_engine/rules/create/helpers';

const REASONABLE_INVOCATION_COUNT = 200;

const emptyPreviewRule: PreviewResponse = {
  previewId: undefined,
  logs: [],
  isAborted: false,
};

export const usePreviewRule = ({
  quickQueryOptions,
  advancedOptions,
}: {
  quickQueryOptions: QuickQueryPreviewOptions;
  advancedOptions?: AdvancedPreviewOptions;
}) => {
  const [rule, setRule] = useState<CreateRulesSchema | null>(null);
  const [response, setResponse] = useState<PreviewResponse>(emptyPreviewRule);
  const [isLoading, setIsLoading] = useState(false);
  const { addError } = useAppToasts();
  let invocationCount = RULE_PREVIEW_INVOCATION_COUNT.HOUR;
  let interval: string = RULE_PREVIEW_INTERVAL.HOUR;
  let from: string = RULE_PREVIEW_FROM.HOUR;

  switch (quickQueryOptions.timeframe) {
    case 'd':
      invocationCount = RULE_PREVIEW_INVOCATION_COUNT.DAY;
      interval = RULE_PREVIEW_INTERVAL.DAY;
      from = RULE_PREVIEW_FROM.DAY;
      break;
    case 'w':
      invocationCount = RULE_PREVIEW_INVOCATION_COUNT.WEEK;
      interval = RULE_PREVIEW_INTERVAL.WEEK;
      from = RULE_PREVIEW_FROM.WEEK;
      break;
    case 'M':
      invocationCount = RULE_PREVIEW_INVOCATION_COUNT.MONTH;
      interval = RULE_PREVIEW_INTERVAL.MONTH;
      from = RULE_PREVIEW_FROM.MONTH;
      break;
  }
  const timeframeEnd = useMemo(
    () =>
      advancedOptions
        ? advancedOptions.timeframeEnd.toISOString()
        : quickQueryOptions.timeframeEnd.toISOString(),
    [advancedOptions, quickQueryOptions]
  );

  if (advancedOptions) {
    const timeframeDuration =
      (advancedOptions.timeframeEnd.valueOf() / 1000 -
        advancedOptions.timeframeStart.valueOf() / 1000) *
      1000;

    const { unit: intervalUnit, value: intervalValue } = getTimeTypeValue(advancedOptions.interval);
    const duration = moment.duration(intervalValue, intervalUnit);
    const ruleIntervalDuration = duration.asMilliseconds();

    invocationCount = Math.max(Math.ceil(timeframeDuration / ruleIntervalDuration), 1);
    interval = advancedOptions.interval;

    const { unit: lookbackUnit, value: lookbackValue } = getTimeTypeValue(advancedOptions.lookback);
    duration.add(lookbackValue, lookbackUnit);

    from = `now-${duration.asSeconds()}s`;
  }
  const showInvocationCountWarning = invocationCount > REASONABLE_INVOCATION_COUNT;

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
            signal: abortCtrl.signal,
          });
          if (isSubscribed) {
            setResponse(previewRuleResponse);
          }
        } catch (error) {
          if (isSubscribed) {
            addError(error, { title: i18n.RULE_ADD_FAILURE });
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
  }, [rule, addError, invocationCount, from, interval, timeframeEnd]);

  return { isLoading, showInvocationCountWarning, response, rule, setRule };
};
