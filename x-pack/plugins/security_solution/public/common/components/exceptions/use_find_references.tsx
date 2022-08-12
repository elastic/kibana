/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';

import { findRuleExceptionReferences } from '../../../detections/containers/detection_engine/rules/api';
import { useKibana } from '../../lib/kibana';

export type ReturnUseFindExceptionListReferences = [boolean, unknown[]];

/**
 * Hook for finding what rules reference a set of exception lists
 * @param listReferences static id of
 */
export const useFindExceptionListReferences = (
  ruleExceptionLists: ListArray
): ReturnUseFindExceptionListReferences => {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(true);
  const [references, setReferences] = useState(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const refs = ruleExceptionLists.map((list) => {
      return {
        id: list.id,
        listId: list.list_id,
        type: list.namespace_type,
      };
    });

    const findReferences = async () => {
      try {
        setIsLoading(true);

        const addOrUpdateItems = await findRuleExceptionReferences({
          lists: refs,
          http,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setIsLoading(false);
          setReferences(addOrUpdateItems);
        }
      } catch (error) {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    if (refs.length === 0 && isSubscribed) {
      setIsLoading(false);
      setReferences(null);
    } else {
      findReferences();
    }

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [http, ruleExceptionLists]);

  return [isLoading, references];
};
