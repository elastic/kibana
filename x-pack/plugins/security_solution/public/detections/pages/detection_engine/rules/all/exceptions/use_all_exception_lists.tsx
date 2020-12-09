/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';

import { fetchRules } from '../../../../../containers/detection_engine/rules/api';

/**
 * Hook for fetching ExceptionLists
 *
 * @param showDetectionsListsOnly boolean, if true, only detection lists are searched
 *
 */
export const useAllExceptionLists = ({ exceptionLists }) => {
  const [loading, setLoading] = useState(true);
  const [exceptionsListInfo, setExceptionsListInfo] = useState([]);
  const { ids, idsMap } = useMemo((): string => {
    const listsMap = {};
    const lists = exceptionLists
      .map(({ id }) => {
        listsMap[id] = [];
        return id;
      })
      .join(' or');
    return { ids: lists, idsMap: listsMap };
  }, [exceptionLists]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);

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

        console.log('------->', ids, rules);

        const result = rules.reduce((acc, rule) => {
          const exceptions = rule.exceptions_list;

          if (exceptions != null && exceptions.length > 0) {
            exceptions.forEach((ex) => {
              const match = acc[ex.id];
              if (match != null) {
                acc[ex.id] = [...match, { ruleId: rule.id, ruleName: rule.name }];
              }
            });
          }

          return acc;
        }, idsMap);

        console.log('=---->', result);

        const a = exceptionLists.map((li) => {
          if (result[li.id] !== null) {
            return { ...li, rules: result[li.id] };
          } else {
            return { ...li, rules: [] };
          }
        });

        setExceptionsListInfo(a);

        if (isSubscribed) {
          setLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };
    console.log(exceptionLists.length);
    if (exceptionLists.length > 0) {
      fetchData();
    }

    return (): void => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [ids, exceptionLists.length, idsMap]);

  return [loading, exceptionsListInfo];
};
