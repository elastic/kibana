/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type {
  List,
  ListArray,
  ExceptionListSchema,
  CreateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  fetchExceptionListById,
  addExceptionList,
  addEndpointExceptionList,
} from '@kbn/securitysolution-list-api';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { HttpStart } from '@kbn/core/public';

import { Rule } from '../../../detections/containers/detection_engine/rules/types';
import {
  fetchRuleById,
  patchRule,
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

    async function createExceptionList(ruleResponse: Rule): Promise<ExceptionListSchema> {
      let newExceptionList: ExceptionListSchema;
      if (exceptionListType === 'endpoint') {
        const possibleEndpointExceptionList = await addEndpointExceptionList({
          http,
          signal: abortCtrl.signal,
        });
        if (Object.keys(possibleEndpointExceptionList).length === 0) {
          // Endpoint exception list already exists, fetch it
          newExceptionList = await fetchExceptionListById({
            http,
            id: ENDPOINT_LIST_ID,
            namespaceType: 'agnostic',
            signal: abortCtrl.signal,
          });
        } else {
          newExceptionList = possibleEndpointExceptionList as ExceptionListSchema;
        }
      } else {
        const exceptionListToCreate: CreateExceptionListSchema = {
          name: ruleResponse.name,
          description: ruleResponse.description,
          type: exceptionListType,
          namespace_type: 'single',
          list_id: undefined,
          tags: undefined,
          meta: undefined,
        };
        newExceptionList = await addExceptionList({
          http,
          list: exceptionListToCreate,
          signal: abortCtrl.signal,
        });
      }
      return Promise.resolve(newExceptionList);
    }

    async function createAndAssociateExceptionList(
      ruleResponse: Rule
    ): Promise<ExceptionListSchema> {
      const newExceptionList = await createExceptionList(ruleResponse);

      const newExceptionListReference = {
        id: newExceptionList.id,
        list_id: newExceptionList.list_id,
        type: newExceptionList.type,
        namespace_type: newExceptionList.namespace_type,
      };
      const newExceptionListReferences: ListArray = [
        ...(ruleResponse.exceptions_list ?? []),
        newExceptionListReference,
      ];

      await patchRule({
        ruleProperties: {
          rule_id: ruleResponse.rule_id,
          exceptions_list: newExceptionListReferences,
        },
        signal: abortCtrl.signal,
      });

      return Promise.resolve(newExceptionList);
    }

    async function fetchRule(): Promise<Rule> {
      return fetchRuleById({
        id: ruleId,
        signal: abortCtrl.signal,
      });
    }

    async function fetchRuleExceptionLists(ruleResponse: Rule): Promise<ExceptionListSchema[]> {
      const exceptionListReferences = ruleResponse.exceptions_list;
      if (exceptionListReferences && exceptionListReferences.length > 0) {
        const exceptionListPromises = exceptionListReferences.map(
          (exceptionListReference: List) => {
            return fetchExceptionListById({
              http,
              id: exceptionListReference.id,
              namespaceType: exceptionListReference.namespace_type,
              signal: abortCtrl.signal,
            });
          }
        );
        return Promise.all(exceptionListPromises);
      } else {
        return Promise.resolve([]);
      }
    }

    async function fetchOrCreateRuleExceptionList() {
      try {
        setIsLoading(true);
        const ruleResponse = await fetchRule();
        const exceptionLists = await fetchRuleExceptionLists(ruleResponse);

        let exceptionListToUse: ExceptionListSchema;
        const matchingList = exceptionLists.find((list) => {
          if (exceptionListType === 'endpoint') {
            return list.type === exceptionListType && list.list_id === ENDPOINT_LIST_ID;
          } else {
            return list.type === exceptionListType;
          }
        });
        if (matchingList !== undefined) {
          exceptionListToUse = matchingList;
        } else {
          exceptionListToUse = await createAndAssociateExceptionList(ruleResponse);
        }

        if (isSubscribed) {
          setExceptionList(exceptionListToUse);
          setIsLoading(false);
          if (onSuccess) {
            onSuccess();
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
