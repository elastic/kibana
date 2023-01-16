/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { useGetInitialUrlParamValue } from '../../../../../common/utils/global_query_string/helpers';
import { RULES_TABLE_MAX_PAGE_SIZE } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import { useRulesTableContext } from './rules_table_context';
import type {
  RulesTableStorageSavedState,
  RulesTableUrlSavedState,
} from './rules_table_saved_state';
import {
  RuleSource,
  RulesTableSavedFilter,
  RulesTableStorageSavedPagination,
  RulesTableUrlSavedPagination,
  RulesTableSavedSorting,
} from './rules_table_saved_state';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_SORTING_OPTIONS } from './rules_table_defaults';

function readStorageState(storage: Storage): RulesTableStorageSavedState | null {
  try {
    return storage.get(RULES_TABLE_STATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function validateState(
  urlState: RulesTableUrlSavedState | null,
  storageState: RulesTableStorageSavedState | null
): [RulesTableSavedFilter, RulesTableSavedSorting, RulesTableUrlSavedPagination] {
  const [filterFromUrl] = validateNonExact(urlState, RulesTableSavedFilter);
  const [filterFromStorage] = validateNonExact(storageState, RulesTableSavedFilter);
  const filter = { ...filterFromStorage, ...filterFromUrl };

  const [sortingFromUrl] = validateNonExact(urlState, RulesTableSavedSorting);
  const [sortingFromStorage] = validateNonExact(storageState, RulesTableSavedSorting);
  const sorting = { ...sortingFromStorage, ...sortingFromUrl };

  const [paginationFromUrl] = validateNonExact(urlState, RulesTableUrlSavedPagination);
  const [paginationFromStorage] = validateNonExact(storageState, RulesTableStorageSavedPagination);
  const pagination = { perPage: paginationFromStorage?.perPage, ...paginationFromUrl };

  return [filter, sorting, pagination];
}

export function useInitializeRulesTableSavedState(): void {
  const getUrlParam = useGetInitialUrlParamValue<RulesTableUrlSavedState>(URL_PARAM_KEY.rulesTable);
  const { actions } = useRulesTableContext();
  const {
    services: { sessionStorage },
  } = useKibana();

  useEffect(() => {
    const { decodedParam: urlState } = getUrlParam();
    const storageState = readStorageState(sessionStorage);

    if (!urlState && !storageState) {
      return;
    }

    const [filter, sorting, pagination] = validateState(urlState, storageState);

    actions.setFilterOptions({
      filter: filter.searchTerm ?? DEFAULT_FILTER_OPTIONS.filter,
      showElasticRules: filter.source === RuleSource.Prebuilt,
      showCustomRules: filter.source === RuleSource.Custom,
      tags: Array.isArray(filter.tags) ? filter.tags : DEFAULT_FILTER_OPTIONS.tags,
    });

    if (sorting.field || sorting.order) {
      actions.setSortingOptions({
        field: sorting.field ?? DEFAULT_SORTING_OPTIONS.field,
        order: sorting.order ?? DEFAULT_SORTING_OPTIONS.order,
      });
    }

    if (pagination.page) {
      actions.setPage(pagination.page);
    }

    if (
      pagination.perPage &&
      pagination.perPage > 0 &&
      pagination.perPage <= RULES_TABLE_MAX_PAGE_SIZE
    ) {
      actions.setPerPage(pagination.perPage);
    }
  }, [getUrlParam, actions, sessionStorage]);
}
