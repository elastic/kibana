/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

import type { ExceptionListRuleReferencesSchema } from '../../../../common/detection_engine/rule_exceptions';
import { findRuleExceptionReferences } from '../../rule_management/api/api';
import { useToasts } from '../../../common/lib/kibana';
import type { FindRulesReferencedByExceptionsListProp } from '../../rule_management/logic/types';
import * as i18n from '../utils/translations';

export interface RuleReferences {
  [key: string]: ExceptionListRuleReferencesSchema;
}

export type FetchReferencesFunc = (
  listsToFetch: FindRulesReferencedByExceptionsListProp[]
) => Promise<void>;

export type ReturnUseFindExceptionListReferences = [
  boolean,
  boolean,
  RuleReferences | null,
  FetchReferencesFunc | null
];

/**
 * Hook for finding what rules are referenced by a set of exception lists
 */
export const useFindExceptionListReferences = (): ReturnUseFindExceptionListReferences => {
  const toasts = useToasts();
  const [isLoading, setIsLoading] = useState(true);
  const [didError, setError] = useState(false);
  const [references, setReferences] = useState<RuleReferences | null>(null);
  const findExceptionListAndReferencesRef = useRef<FetchReferencesFunc | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const findReferences = async (listsToFetch: FindRulesReferencedByExceptionsListProp[]) => {
      try {
        setIsLoading(true);

        const { references: referencesResults } = await findRuleExceptionReferences({
          lists: listsToFetch,
          signal: abortCtrl.signal,
        });

        const results = referencesResults.reduce<RuleReferences>((acc, result) => {
          const [[key, value]] = Object.entries(result);

          acc[key] = value;

          return acc;
        }, {});

        if (isSubscribed) {
          setIsLoading(false);
          setError(false);
          setReferences(results);
        }
      } catch (error) {
        if (isSubscribed) {
          setError(true);
          setIsLoading(false);
          toasts.addError(error, { title: i18n.ERROR_FETCHING_REFERENCES_TITLE });
        }
      }
    };

    findExceptionListAndReferencesRef.current = findReferences;

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [toasts]);

  return [isLoading, didError, references, findExceptionListAndReferencesRef.current];
};
