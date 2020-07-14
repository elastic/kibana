/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useEffect, useState, useRef } from 'react';

import { FetchRulesResponse, FilterOptions, PaginationOptions, Rule } from './types';
import { errorToToaster, useStateToaster } from '../../../../common/components/toasters';
import { fetchRules } from './api';
import * as i18n from './translations';

export type ReturnRules = [
  boolean,
  FetchRulesResponse | null,
  (refreshPrePackagedRule?: boolean) => void
];

export interface UseRules {
  pagination: PaginationOptions;
  filterOptions: FilterOptions;
  refetchPrePackagedRulesStatus?: () => void;
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
  refetchPrePackagedRulesStatus,
  dispatchRulesInReducer,
}: UseRules): ReturnRules => {
  const [rules, setRules] = useState<FetchRulesResponse | null>(null);
  const reFetchRules = useRef<(refreshPrePackagedRule?: boolean) => void>(noop);
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData() {
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
          errorToToaster({ title: i18n.RULE_FETCH_FAILURE, error, dispatchToaster });
          if (dispatchRulesInReducer != null) {
            dispatchRulesInReducer([], {});
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchData();
    reFetchRules.current = (refreshPrePackagedRule: boolean = false) => {
      fetchData();
      if (refreshPrePackagedRule && refetchPrePackagedRulesStatus != null) {
        refetchPrePackagedRulesStatus();
      }
    };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    filterOptions.tags?.sort().join(),
    filterOptions.showCustomRules,
    filterOptions.showElasticRules,
    refetchPrePackagedRulesStatus,
  ]);

  return [loading, rules, reFetchRules.current];
};
