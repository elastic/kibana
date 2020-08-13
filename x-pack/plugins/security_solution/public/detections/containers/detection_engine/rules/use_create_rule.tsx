/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch } from 'react';

import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { CreateRulesSchema } from '../../../../../common/detection_engine/schemas/request';

import { createRule } from './api';
import * as i18n from './translations';

interface CreateRuleReturn {
  isLoading: boolean;
  isSaved: boolean;
}

export type ReturnCreateRule = [CreateRuleReturn, Dispatch<CreateRulesSchema | null>];

export const useCreateRule = (): ReturnCreateRule => {
  const [rule, setRule] = useState<CreateRulesSchema | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);
    async function saveRule() {
      if (rule != null) {
        try {
          setIsLoading(true);
          await createRule({ rule, signal: abortCtrl.signal });
          if (isSubscribed) {
            setIsSaved(true);
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
    }

    saveRule();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule]);

  return [{ isLoading, isSaved }, setRule];
};
