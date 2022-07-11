/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import {
  ExceptionListSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import { fetchExceptionListById } from '@kbn/securitysolution-list-api';
import { HttpStart } from '@kbn/core/public';
import { ENDPOINT_LIST_DESCRIPTION, ENDPOINT_LIST_ID, ENDPOINT_LIST_NAME } from '@kbn/securitysolution-list-constants';
import type { HttpStart } from '@kbn/core/public';

import type { Rule } from '../../../detections/containers/detection_engine/rules/types';
import {
  createAndAssociateExceptionList,
  fetchRuleById,
} from '../../../detections/containers/detection_engine/rules/api';

export type ReturnUseFetchOrCreateRuleExceptionList = [boolean, ExceptionListSchema | null];

export interface UseFetchOrCreateRuleExceptionListProps {
  http: HttpStart;
  ruleId: Rule['id'];
  exceptionListType: 'endpoint' | 'rule_default';
  onError: (arg: Error, code: number | null, message: string | null) => void;
  onSuccess?: (ruleWasChanged: boolean) => void;
}

/**
 * Hook for fetching or creating an exception list
 *
 * @param http Kibana http service
 * @param ruleId id of the rule
 * @param exceptionListType type of the exception list to be fetched or created
 * @param onSuccess success callback
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

    async function createExceptionList(
      ruleResponse: Rule
    ): Promise<ExceptionListSchema> {
      if (exceptionListType === 'endpoint') {
        return createAndAssociateExceptionList({
          ruleId: ruleResponse.rule_id,
          ruleSoId: ruleResponse.id,
          isEndpoint: true,
          list: {
            name: ENDPOINT_LIST_NAME,
            description: ENDPOINT_LIST_DESCRIPTION,
            type: ExceptionListTypeEnum.ENDPOINT,
            namespace_type: 'agnostic',
            list_id: ENDPOINT_LIST_ID,
            tags: [],
            meta: undefined,
          }
        });
      } else {
        return createAndAssociateExceptionList({
          ruleId: ruleResponse.rule_id,
          ruleSoId: ruleResponse.id,
          list: {
            name: `${ruleResponse.name} - Default Exception List`,
            description: ruleResponse.description,
            type: ExceptionListTypeEnum.RULE_DEFAULT,
            namespace_type: 'single',
            list_id: undefined,
            tags: undefined,
            meta: undefined,
          },
          signal: abortCtrl.signal,
        });
      }
    }

    async function fetchOrCreateRuleExceptionList() {
      try {
        setIsLoading(true);
        const ruleResponse = await fetchRuleById({
          id: ruleId,
          signal: abortCtrl.signal,
        });
        const defaultList = (ruleResponse.exceptions_list ?? []).find(({ type }) => type === exceptionListType);

        if (defaultList != null) {
          const exceptionListToUse = await fetchExceptionListById({
            http,
            id: defaultList.id,
            namespaceType: defaultList.namespace_type,
            signal: abortCtrl.signal,
          });

          if (isSubscribed) {
            setExceptionList(exceptionListToUse);
          }
        } else {
          const exceptionListToUse = await createExceptionList(ruleResponse);

          if (isSubscribed) {
            setExceptionList(exceptionListToUse);
          }
        }

        if (isSubscribed) {
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
