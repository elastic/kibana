/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useRef } from 'react';

import { FetchRulesResponse, FilterOptions, PaginationOptions, Rule } from './types';
import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { fetchRules } from './api';
import * as i18n from './translations';

export type ReturnRules = [boolean, FetchRulesResponse | null, () => Promise<void>];

export interface UseRules {
  pagination: PaginationOptions;
  filterOptions: FilterOptions;
  dispatchRulesInReducer?: (rules: Rule[], pagination: Partial<PaginationOptions>) => void;
}

/**
 * Hook for using the list of Rules from the Detection Engine API
 *
 * @param pagination desired pagination options (e.g. page/perPage)
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 */
export const useRules = ({
  pagination,
  filterOptions,
  dispatchRulesInReducer,
}: UseRules): ReturnRules => {
  const [rules, setRules] = useState<FetchRulesResponse | null>(null);
  const reFetchRules = useRef<() => Promise<void>>(() => Promise.resolve());
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();

  const filterTags = filterOptions.tags.sort().join();
  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const fetchRulesResult = await fetchRules({
          filterOptions,
          pagination,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRules(fetchRulesResult);
          if (dispatchRulesInReducer != null) {
            dispatchRulesInReducer(fetchRulesResult.data, {
              page: fetchRulesResult.page,
              perPage: fetchRulesResult.perPage,
              total: fetchRulesResult.total,
            });
          }
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({ title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE, error, dispatchToaster });
          if (dispatchRulesInReducer != null) {
            dispatchRulesInReducer([], {});
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchData();
    reFetchRules.current = (): Promise<void> => fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.perPage,
    filterOptions.filter,
    filterOptions.sortField,
    filterOptions.sortOrder,
    filterTags,
    filterOptions.showCustomRules,
    filterOptions.showElasticRules,
  ]);

  return [loading, rules, reFetchRules.current];
};
