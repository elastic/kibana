/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  CreateExceptionListSchema,
  ExceptionListSchema,
  ListArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { addExceptionList } from '@kbn/securitysolution-list-api';
import { fetchRuleById, patchRule } from '@kbn/security-solution-plugin/public/detections/containers/detection_engine/rules/api';

import * as i18n from './translations';
import { useKibana } from '../../../lib/kibana';

export type PostExceptionListAndAssociateFunc = (
  list: CreateExceptionListSchema,
  ruleIds: Array<{ id: string; ruleId: string; }>,
) => Promise<ExceptionListSchema>;

export type ReturnPersistExceptionList = [
  boolean,
  PostExceptionListAndAssociateFunc | null
];

/**
 * Hook for creating an exception list and associating it with rules
 *
 */
export const useCreateAndAssociateExceptionList = ((): ReturnPersistExceptionList => {
  const { http, notifications } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const postExceptionList = useRef<PostExceptionListAndAssociateFunc | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const createAndAssociateExceptionList = async (
      list: CreateExceptionListSchema,
      ruleIds: Array<{ id: string; ruleId: string; }> = [],
    ): Promise<ExceptionListSchema> => {
      setIsLoading(true);
      
      try {
        const newExceptionList = await addExceptionList({
          http,
          list,
          signal: abortCtrl.signal,
        });
  
        const newExceptionListReference = {
          id: newExceptionList.id,
          list_id: newExceptionList.list_id,
          type: newExceptionList.type,
          namespace_type: newExceptionList.namespace_type,
        };
        
        if (ruleIds.length > 0) {
          await Promise.all(ruleIds.map(async ({id, ruleId}) => {
            const rule = await fetchRuleById({
              id,
              signal: abortCtrl.signal,
            });
      
            const newExceptionListReferences: ListArray = [
              ...(rule.exceptions_list ?? []),
              newExceptionListReference,
            ];
      
            return patchRule({
              ruleProperties: {
                rule_id: ruleId,
                exceptions_list: newExceptionListReferences,
              },
              signal: abortCtrl.signal,
            });
          }));
        }

        if (isSubscribed) {
          notifications.toasts.addSuccess({
            title: i18n.exceptionListCreateSuccessMessage(newExceptionList.list_id),
          });

          setIsLoading(false);
        }

        return newExceptionList;
      } catch (err) {
        if (isSubscribed) {
          setIsLoading(false);
          isSubscribed = false;
          notifications.toasts.addError(err, {
            title: i18n.EXCEPTION_LIST_CREATE_TOAST_ERROR,
          });
        }
      }
    };

    postExceptionList.current = createAndAssociateExceptionList;

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, notifications.toasts]);

  return [isLoading, postExceptionList.current];
});
