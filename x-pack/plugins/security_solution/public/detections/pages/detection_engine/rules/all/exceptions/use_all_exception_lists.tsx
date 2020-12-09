/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { ExceptionListSchema } from '../../../../../../../../lists/common';

import { fetchRules } from '../../../../../containers/detection_engine/rules/api';

export interface ExceptionListInfo extends ExceptionListSchema {
  rules: Array<{ name: string; id: string }>;
}

export type UseAllExceptionListsReturn = [boolean, ExceptionListInfo[]];

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
  const [exceptionsListInfo, setExceptionsListInfo] = useState<ExceptionListInfo[]>([]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);

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

        const { data: rules } = await fetchRules({
          filterOptions: {
            filter: '',
            showCustomRules: true,
            showElasticRules: true,
            sortField: 'updated_at',
            sortOrder: 'desc',
            tags: [],
          },
          pagination: {
            page: 1,
            perPage: 10000,
            total: 0,
          },
          signal: abortCtrl.signal,
        });

        const updatedLists = rules.reduce<Record<string, ExceptionListInfo>>((acc, rule) => {
          const exceptions = rule.exceptions_list;

          if (exceptions != null && exceptions.length > 0) {
            exceptions.forEach((ex) => {
              const list = acc[ex.id];
              if (list != null) {
                acc[ex.id] = {
                  ...list,
                  rules: [...list.rules, { id: rule.id, name: rule.name }],
                };
              }
            });
          }

          return acc;
        }, listsSkeleton);

        const lists = Object.keys(updatedLists).map<ExceptionListInfo>(
          (listKey) => updatedLists[listKey]
        );

        setExceptionsListInfo(lists);

        if (isSubscribed) {
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    if (exceptionLists.length > 0) {
      fetchData();
    }

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [exceptionLists.length, exceptionLists]);

  return [loading, exceptionsListInfo];
};
