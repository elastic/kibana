/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateRuleExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useEffect, useRef, useState } from 'react';

import { addRuleExceptions } from '../../rule_management/api/api';
import type { Rule } from '../../rule_management/logic/types';

/**
 * Adds exception items to rules default exception list
 *
 * @param exceptions exception items to be added
 * @param ruleId `id` of rule to add exceptions to
 *
 */
export type AddRuleExceptionsFunc = (
  exceptions: CreateRuleExceptionListItemSchema[],
  rules: Rule[]
) => Promise<ExceptionListItemSchema[]>;

export type ReturnUseAddRuleException = [boolean, AddRuleExceptionsFunc | null];

/**
 * Hook for adding exceptions to a rule default exception list
 *
 */
export const useAddRuleDefaultException = (): ReturnUseAddRuleException => {
  const [isLoading, setIsLoading] = useState(false);
  const addRuleExceptionFunc = useRef<AddRuleExceptionsFunc | null>(null);

  useEffect(() => {
    const abortCtrl = new AbortController();

    const addExceptionItemsToRule: AddRuleExceptionsFunc = async (
      exceptions: CreateRuleExceptionListItemSchema[],
      rules: Rule[]
    ): Promise<ExceptionListItemSchema[]> => {
      setIsLoading(true);

      // TODO: Update once bulk route is added
      const result = await Promise.all(
        rules.map(async (rule) =>
          addRuleExceptions({
            items: exceptions,
            ruleId: rule.id,
            signal: abortCtrl.signal,
          })
        )
      );

      setIsLoading(false);

      return result.flatMap((r) => r);
    };
    addRuleExceptionFunc.current = addExceptionItemsToRule;

    return (): void => {
      setIsLoading(false);
      abortCtrl.abort();
    };
  }, []);

  return [isLoading, addRuleExceptionFunc.current];
};
