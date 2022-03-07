/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, Dispatch } from 'react';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { UpdateRulesSchema } from '../../../../../common/detection_engine/schemas/request';

import { transformOutput } from './transforms';

import { updateRule } from './api';
import * as i18n from './translations';
import { useInvalidateRules } from './use_find_rules_query';

interface UpdateRuleReturn {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnUpdateRule = [UpdateRuleReturn, Dispatch<UpdateRulesSchema | null>];

export const useUpdateRule = (): ReturnUpdateRule => {
  const [rule, setRule] = useState<UpdateRulesSchema | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addError } = useAppToasts();
  const invalidateRules = useInvalidateRules();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);
    const saveRule = async () => {
      if (rule != null) {
        try {
          setIsLoading(true);
          await updateRule({ rule: transformOutput(rule), signal: abortCtrl.signal });
          invalidateRules();
          if (isSubscribed) {
            setIsSaved(true);
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

    saveRule();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [rule, addError, invalidateRules]);

  return [{ isLoading, isSaved }, setRule];
};
