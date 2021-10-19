/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

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
  errors: [],
  warnings: [],
};

export const usePreviewRule = () => {
  const [rule, setRule] = useState<CreateRulesSchema | null>(null);
  const [response, setResponse] = useState<PreviewResponse>(emptyPreviewRule);
  const [isLoading, setIsLoading] = useState(false);
  const { addError } = useAppToasts();

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
            rule: { ...transformOutput(rule), invocationCount: 1 },
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
  }, [rule, addError]);

  return { isLoading, response, rule, setRule };
};
