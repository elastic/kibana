/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { RULE_TABLE_STATE_STORAGE_KEY } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { useUpdateUrlParam } from '../../../../../common/utils/global_query_string';
import { AllRulesTabs } from '../rules_table_toolbar';
import type { RulesTableState } from './rules_table_context';
import { useRulesTableContext } from './rules_table_context';
import { useSyncRulesTableSavedState } from './use_sync_rules_table_saved_state';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/utils/global_query_string');
jest.mock('./rules_table_context');

describe('useSyncRulesTableSavedState', () => {
  const state: Partial<RulesTableState> = {
    isInMemorySorting: false,
    filterOptions: {
      filter: '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sortingOptions: {
      field: 'name',
      order: 'desc',
    },
    pagination: {
      page: 2,
      perPage: 10,
      total: 100,
    },
  };
  const expectedSavedState = {
    inMemory: false,
    filter: {
      filter: '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sort: {
      field: 'name',
      order: 'desc',
    },
    page: 2,
    perPage: 10,
  };

  let updateUrlParam: jest.Mock;
  let setStorage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    (useRulesTableContext as jest.Mock).mockReturnValue({ state });

    updateUrlParam = jest.fn();
    setStorage = jest.fn();

    (useUpdateUrlParam as jest.Mock).mockReturnValue(updateUrlParam);
    (useKibana as jest.Mock).mockReturnValue({
      services: { storage: { set: setStorage } },
    });
  });

  it('syncs the state with the url', () => {
    renderHook(() => useSyncRulesTableSavedState(AllRulesTabs.monitoring));

    expect(updateUrlParam).toHaveBeenCalledWith({ ...expectedSavedState, tab: 'monitoring' });
  });

  it('syncs the state with the storage', () => {
    renderHook(() => useSyncRulesTableSavedState(AllRulesTabs.monitoring));

    expect(setStorage).toHaveBeenCalledWith(RULE_TABLE_STATE_STORAGE_KEY, {
      ...expectedSavedState,
      tab: 'monitoring',
    });
  });

  it('does not sync the default active tab with the url', () => {
    renderHook(() => useSyncRulesTableSavedState(AllRulesTabs.rules));

    expect(updateUrlParam).toHaveBeenCalledWith(expectedSavedState);
  });

  it('does not sync the default active tab with the storage', () => {
    renderHook(() => useSyncRulesTableSavedState(AllRulesTabs.rules));

    expect(setStorage).toHaveBeenCalledWith(RULE_TABLE_STATE_STORAGE_KEY, expectedSavedState);
  });
});
