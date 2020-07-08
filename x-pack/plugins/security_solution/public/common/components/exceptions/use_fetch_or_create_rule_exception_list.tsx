/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { HttpStart } from '../../../../../../../src/core/public';

import {
  ExceptionListSchema,
  CreateExceptionListSchema,
} from '../../../../../lists/common/schemas';
import { Rule } from '../../../detections/containers/detection_engine/rules/types';
import { List, ListArray } from '../../../../common/detection_engine/schemas/types';
import {
  fetchRuleById,
  patchRule,
} from '../../../detections/containers/detection_engine/rules/api';
import { fetchExceptionListById, addExceptionList } from '../../../lists_plugin_deps';

export type ReturnUseFetchOrCreateRuleExceptionList = [boolean, ExceptionListSchema | null];

export interface UseFetchOrCreateRuleExceptionListProps {
  http: HttpStart;
  ruleId: Rule['id'];
  exceptionListType: ExceptionListSchema['type'];
  onError: (arg: Error) => void;
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
}: UseFetchOrCreateRuleExceptionListProps): ReturnUseFetchOrCreateRuleExceptionList => {
  const [isLoading, setIsLoading] = useState(false);
  const [exceptionList, setExceptionList] = useState<ExceptionListSchema | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function createExceptionList(ruleResponse: Rule): Promise<ExceptionListSchema> {
      const exceptionListToCreate: CreateExceptionListSchema = {
        name: ruleResponse.name,
        description: ruleResponse.description,
        type: exceptionListType,
        namespace_type: exceptionListType === 'endpoint' ? 'agnostic' : 'single',
        _tags: undefined,
        tags: undefined,
        list_id: exceptionListType === 'endpoint' ? 'endpoint_list' : undefined,
        meta: undefined,
      };
      try {
        const newExceptionList = await addExceptionList({
          http,
          list: exceptionListToCreate,
          signal: abortCtrl.signal,
        });
        return Promise.resolve(newExceptionList);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    async function createAndAssociateExceptionList(
      ruleResponse: Rule
    ): Promise<ExceptionListSchema> {
      const newExceptionList = await createExceptionList(ruleResponse);

      const newExceptionListReference = {
        id: newExceptionList.id,
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
            return list.type === exceptionListType && list.list_id === 'endpoint_list';
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
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
          setExceptionList(null);
          onError(error);
        }
      }
    }

    fetchOrCreateRuleExceptionList();
    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, ruleId, exceptionListType, onError]);

  return [isLoading, exceptionList];
};
