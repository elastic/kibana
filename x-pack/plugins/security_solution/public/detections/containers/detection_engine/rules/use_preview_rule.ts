/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { Unit } from '@elastic/datemath';
import {
  RULE_PREVIEW_FROM,
  RULE_PREVIEW_INTERVAL,
  RULE_PREVIEW_INVOCATION_COUNT,
} from '../../../../../common/detection_engine/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  PreviewResponse,
  CreateRulesSchema,
} from '../../../../../common/detection_engine/schemas/request';

import { previewRule } from './api';
import * as i18n from './translations';
import { transformOutput } from './transforms';

const emptyPreviewRule: PreviewResponse = {
  previewId: undefined,
  logs: [],
  isAborted: false,
};

export const usePreviewRule = (timeframe: Unit = 'h') => {
  const [rule, setRule] = useState<CreateRulesSchema | null>(null);
  const [response, setResponse] = useState<PreviewResponse>(emptyPreviewRule);
  const [isLoading, setIsLoading] = useState(false);
  const { addError } = useAppToasts();
  let invocationCount = RULE_PREVIEW_INVOCATION_COUNT.HOUR;
  let interval = RULE_PREVIEW_INTERVAL.HOUR;
  let from = RULE_PREVIEW_FROM.HOUR;

  switch (timeframe) {
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
  }, [rule, addError, invocationCount, from, interval]);

  return { isLoading, response, rule, setRule };
};
