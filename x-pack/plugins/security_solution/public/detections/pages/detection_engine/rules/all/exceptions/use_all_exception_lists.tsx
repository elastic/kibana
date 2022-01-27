/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Rule } from '../../../../../containers/detection_engine/rules';
import { fetchRules } from '../../../../../containers/detection_engine/rules/api';
export interface ExceptionListInfo extends ExceptionListSchema {
  rules: Rule[];
}

export type UseAllExceptionListsReturn = [
  boolean,
  ExceptionListInfo[],
  Record<string, ExceptionListInfo>
];

/**
 * Hook for preparing exception lists table info. For now, we need to do a table scan
 * of all rules to figure out which exception lists are used in what rules. This is very
 * slow, however, there is an issue open that would push all this work to Kiaban/ES and
 * speed things up a ton - https://github.com/elastic/kibana/issues/85173
 *
 * @param exceptionLists ExceptionListSchema(s) to evaluate
 *
 */
export const useAllExceptionLists = ({
  exceptionLists,
}: {
  exceptionLists: ExceptionListSchema[];
}): UseAllExceptionListsReturn => {
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<ExceptionListInfo[]>([]);
  const [exceptionsListsInfo, setExceptionsListInfo] = useState<Record<string, ExceptionListInfo>>(
    {}
  );

  const handleExceptionsInfo = useCallback(
    (rules: Rule[]): Record<string, ExceptionListInfo> => {
      const listsSkeleton = exceptionLists.reduce<Record<string, ExceptionListInfo>>(
        (acc, { id, ...rest }) => {
          acc[id] = {
            ...rest,
            id,
            rules: [],
          };

          return acc;
        },
        {}
      );

      return rules.reduce<Record<string, ExceptionListInfo>>((acc, rule) => {
        const ruleExceptionLists = rule.exceptions_list;

        if (ruleExceptionLists != null && ruleExceptionLists.length > 0) {
          ruleExceptionLists.forEach((ex) => {
            const list = acc[ex.id];
            if (list != null) {
              acc[ex.id] = {
                ...list,
                rules: [...list.rules, rule],
              };
            }
          });
        }

        return acc;
      }, listsSkeleton);
    },
    [exceptionLists]
  );

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      if (exceptionLists.length === 0 && isSubscribed) {
        setLoading(false);
        setExceptions([]);
        setExceptionsListInfo({});
        return;
      }

      try {
        setLoading(true);

        const { data: rules } = await fetchRules({
          pagination: {
            page: 1,
            perPage: 10000,
          },
          signal: abortCtrl.signal,
        });

        const updatedLists = handleExceptionsInfo(rules);

        const lists = Object.keys(updatedLists).map<ExceptionListInfo>(
          (listKey) => updatedLists[listKey]
        );

        setExceptions(lists);
        setExceptionsListInfo(updatedLists);

        if (isSubscribed) {
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [exceptionLists.length, handleExceptionsInfo]);

  return [loading, exceptions, exceptionsListsInfo];
};
