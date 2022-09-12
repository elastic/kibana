/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';

import type { RuleReferenceSchema } from '../../../../common/detection_engine/schemas/response';
import { findRuleExceptionReferences } from '../../../detections/containers/detection_engine/rules/api';
import { useToasts } from '../../../common/lib/kibana';
import type { FindRulesReferencedByExceptionsListProp } from '../../../detections/containers/detection_engine/rules/types';
import * as i18n from '../utils/translations';

export type ReturnUseFindExceptionListReferences = [boolean, RuleReferences | null];

export interface RuleReferences {
  [key: string]: RuleReferenceSchema[];
}
/**
 * Hook for finding what rules are referenced by a set of exception lists
 * @param ruleExceptionLists array of exception list info stored on a rule
 */
export const useFindExceptionListReferences = (
  ruleExceptionLists: ListArray
): ReturnUseFindExceptionListReferences => {
  const toasts = useToasts();
  const [isLoading, setIsLoading] = useState(false);
  const [references, setReferences] = useState<RuleReferences | null>(null);
  const listRefs = useMemo((): FindRulesReferencedByExceptionsListProp[] => {
    return ruleExceptionLists.map((list) => {
      return {
        id: list.id,
        listId: list.list_id,
        namespaceType: list.namespace_type,
      };
    });
  }, [ruleExceptionLists]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const findReferences = async () => {
      try {
        setIsLoading(true);

        const { references: referencesResults } = await findRuleExceptionReferences({
          lists: listRefs,
          signal: abortCtrl.signal,
        });

        const results = referencesResults.reduce<RuleReferences>((acc, result) => {
          const [[key, value]] = Object.entries(result);

          acc[key] = value;

          return acc;
        }, {});

        if (isSubscribed) {
          setIsLoading(false);
          setReferences(results);
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
          toasts.addError(error, { title: i18n.ERROR_FETCHING_REFERENCES_TITLE });
        }
      }
    };

    if (listRefs.length === 0 && isSubscribed) {
      setIsLoading(false);
      setReferences(null);
    } else {
      findReferences();
    }

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [ruleExceptionLists, listRefs, toasts]);

  return [isLoading, references];
};
