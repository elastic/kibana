/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CreateRuleExceptionListItemSchema } from '../../../../common/detection_engine/schemas/request';
import { addRuleExceptions } from '../../../detections/containers/detection_engine/rules/api';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

/**
 * Adds exception items to rules default exception list
 *
 * @param exceptions exception items to be added
 * @param ruleId `id` of rule to add exceptions to
 *
 */
export type AddRuleExceptionsFunc = (
  exceptions: CreateRuleExceptionListItemSchema[],
  ruleId: string,
  ruleName: string
) => Promise<void>;

export type ReturnUseAddRuleException = [boolean, AddRuleExceptionsFunc | null];

/**
 * Hook for adding exceptions to a rule default exception list
 *
 */
export const useAddRuleException = (): ReturnUseAddRuleException => {
  const { addSuccess, addError } = useAppToasts();

  const [isLoading, setIsLoading] = useState(false);
  const addRuleExceptionFunc = useRef<AddRuleExceptionsFunc | null>(null);
  const addException = useCallback<AddRuleExceptionsFunc>(async (exceptions, ruleId, ruleName) => {
    if (addRuleExceptionFunc.current != null) {
      addRuleExceptionFunc.current(exceptions, ruleId, ruleName);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const addExceptionItemsToRule: AddRuleExceptionsFunc = async (
      exceptions: CreateRuleExceptionListItemSchema[],
      ruleId: string,
      ruleName: string
    ) => {
      try {
        setIsLoading(true);

        await addRuleExceptions({ items: exceptions, ruleId, signal: abortCtrl.signal });

        if (isSubscribed) {
          setIsLoading(false);
          addSuccess({
            title: i18n.ADD_RULE_EXCEPTION_SUCCESS_TITLE,
            text: i18n.ADD_RULE_EXCEPTION_SUCCESS_TEXT(ruleName),
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
          addError(error, {
            title: i18n.ADD_RULE_EXCEPTION_ERROR_TITLE(ruleName),
            toastMessage: error.message,
          });
        }
      }
    };

    addRuleExceptionFunc.current = addExceptionItemsToRule;
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [addError, addSuccess]);

  return [isLoading, addException];
};
