/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, Dispatch } from 'react';

import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { CreateRulesSchema } from '../../../../../common/detection_engine/schemas/request';

import { createRule } from './api';
import * as i18n from './translations';
import { transformOutput } from './transforms';

interface CreateRuleReturn {
  isLoading: boolean;
  ruleId: string | null;
}

export type ReturnCreateRule = [CreateRuleReturn, Dispatch<CreateRulesSchema | null>];

export const useCreateRule = (): ReturnCreateRule => {
  const [rule, setRule] = useState<CreateRulesSchema | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setRuleId(null);
    const saveRule = async () => {
      if (rule != null) {
        try {
          setIsLoading(true);
          const createRuleResponse = await createRule({
            rule: transformOutput(rule),
            signal: abortCtrl.signal,
          });
          if (isSubscribed) {
            setRuleId(createRuleResponse.id);
          }
        } catch (error) {
          if (isSubscribed) {
            errorToToaster({ title: i18n.RULE_ADD_FAILURE, error, dispatchToaster });
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
  }, [rule, dispatchToaster]);

  return [{ isLoading, ruleId }, setRule];
};
