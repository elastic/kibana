/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { HttpStart } from '@kbn/core/public';

import { Rule } from '../../../detections/containers/detection_engine/rules/types';
import {
  createDefaultExceptionListForRule,
  fetchRuleById,
} from '../../../detections/containers/detection_engine/rules/api';

export type ReturnUseFetchOrCreateRuleExceptionList = [boolean, ExceptionListSchema | null];

export interface UseFetchOrCreateRuleExceptionListProps {
  http: HttpStart;
  ruleId: Rule['id'];
  exceptionListType: ExceptionListSchema['type'];
  onError: (arg: Error, code: number | null, message: string | null) => void;
  onSuccess?: (ruleWasChanged: boolean) => void;
}

/**
 * Hook for fetching or creating an exception list
 *
 * @param http Kibana http service
 * @param ruleId id of the rule
 * @param exceptionListType type of the exception list to be fetched or created
 * @param onError error callback
 *
 */
export const useFetchOrCreateRuleExceptionList = ({
  http,
  ruleId,
  exceptionListType,
  onError,
  onSuccess,
}: UseFetchOrCreateRuleExceptionListProps): ReturnUseFetchOrCreateRuleExceptionList => {
  const [isLoading, setIsLoading] = useState(false);
  const [exceptionList, setExceptionList] = useState<ExceptionListSchema | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function createAndAssociateExceptionList(
      ruleResponse: Rule
    ): Promise<ExceptionListSchema> {
      const newExceptionList = await createDefaultExceptionListForRule({
        ruleId: ruleResponse.id,
        ruleSoId: ruleResponse.rule_id,
        list: {
          name: ruleResponse.name,
          description: ruleResponse.description,
          type: 'detection_rule_default',
          namespace_type: 'single',
          list_id: undefined,
          tags: undefined,
          meta: undefined,
        },
      });

      return Promise.resolve(newExceptionList);
    }

    async function fetchRule(): Promise<Rule> {
      return fetchRuleById({
        id: ruleId,
        signal: abortCtrl.signal,
      });
    }

    async function fetchOrCreateRuleExceptionList() {
      try {
        setIsLoading(true);
        const ruleResponse = await fetchRule();
        // const exceptionLists = await fetchRuleExceptionLists(ruleResponse);

        const exceptionListToUse = await createAndAssociateExceptionList(ruleResponse);
        console.log({ exceptionListToUse });

        if (isSubscribed) {
          setExceptionList(exceptionListToUse);
          setIsLoading(false);
          if (onSuccess) {
            onSuccess(false);
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
          setExceptionList(null);
          if (error.body != null) {
            onError(error, error.body.status_code, error.body.message);
          } else {
            onError(error, null, null);
          }
        }
      }
    }

    fetchOrCreateRuleExceptionList();
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, ruleId, exceptionListType, onError, onSuccess]);

  return [isLoading, exceptionList];
};
