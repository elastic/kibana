/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useCallback, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { Rule, Pagination } from '../../types';
import type { LoadRulesProps } from '../lib/rule_api';
import { loadRulesWithKueryFilter } from '../lib/rule_api/rules_kuery_filter';
import { useKibana } from '../../common/lib/kibana';

interface RuleState {
  isLoading: boolean;
  data: Rule[];
  totalItemCount: number;
}

type UseLoadRulesProps = Omit<LoadRulesProps, 'http'> & {
  hasDefaultRuleTypesFiltersOn?: boolean;
  onPage: (pagination: Pagination) => void;
  onError: (message: string) => void;
};

interface UseLoadRulesState {
  rulesState: RuleState;
  noData: boolean;
  initialLoad: boolean;
}

enum ActionTypes {
  SET_RULE_STATE = 'SET_RULE_STATE',
  SET_LOADING = 'SET_LOADING',
  SET_INITIAL_LOAD = 'SET_INITIAL_LOAD',
  SET_NO_DATA = 'SET_NO_DATA',
}

interface Action {
  type: ActionTypes;
  payload: boolean | RuleState;
}

const initialState: UseLoadRulesState = {
  rulesState: {
    isLoading: false,
    data: [],
    totalItemCount: 0,
  },
  noData: true,
  initialLoad: true,
};

const reducer = (state: UseLoadRulesState, action: Action) => {
  const { type, payload } = action;
  switch (type) {
    case ActionTypes.SET_RULE_STATE:
      return {
        ...state,
        rulesState: payload as RuleState,
      };
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        rulesState: {
          ...state.rulesState,
          isLoading: payload as boolean,
        },
      };
    case ActionTypes.SET_INITIAL_LOAD:
      return {
        ...state,
        initialLoad: payload as boolean,
      };
    case ActionTypes.SET_NO_DATA:
      return {
        ...state,
        noData: payload as boolean,
      };
    default:
      return state;
  }
};

export function useLoadRules({
  page,
  searchText,
  typesFilter,
  actionTypesFilter,
  ruleExecutionStatusesFilter,
  ruleLastRunOutcomesFilter,
  ruleStatusesFilter,
  tagsFilter,
  sort,
  onPage,
  onError,
  hasDefaultRuleTypesFiltersOn = false,
}: UseLoadRulesProps) {
  const { http } = useKibana().services;
  const [state, dispatch] = useReducer(reducer, initialState);

  const setRulesState = useCallback(
    (rulesState: RuleState) => {
      dispatch({
        type: ActionTypes.SET_RULE_STATE,
        payload: rulesState,
      });
    },
    [dispatch]
  );

  const internalLoadRules = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });

    try {
      const rulesResponse = await loadRulesWithKueryFilter({
        http,
        page,
        searchText,
        typesFilter,
        actionTypesFilter,
        ruleExecutionStatusesFilter,
        ruleLastRunOutcomesFilter,
        ruleStatusesFilter,
        tagsFilter,
        sort,
      });

      dispatch({
        type: ActionTypes.SET_RULE_STATE,
        payload: {
          isLoading: false,
          data: rulesResponse.data,
          totalItemCount: rulesResponse.total,
        },
      });

      if (!rulesResponse.data?.length && page.index > 0) {
        onPage({ ...page, index: 0 });
      }

      const hasEmptyTypesFilter = hasDefaultRuleTypesFiltersOn ? true : isEmpty(typesFilter);
      const isFilterApplied = !(
        isEmpty(searchText) &&
        hasEmptyTypesFilter &&
        isEmpty(actionTypesFilter) &&
        isEmpty(ruleExecutionStatusesFilter) &&
        isEmpty(ruleLastRunOutcomesFilter) &&
        isEmpty(ruleStatusesFilter) &&
        isEmpty(tagsFilter)
      );

      dispatch({
        type: ActionTypes.SET_NO_DATA,
        payload: rulesResponse.data.length === 0 && !isFilterApplied,
      });
    } catch (e) {
      onError(
        i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRulesMessage', {
          defaultMessage: 'Unable to load rules',
        })
      );
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
    dispatch({ type: ActionTypes.SET_INITIAL_LOAD, payload: false });
  }, [
    http,
    page,
    searchText,
    typesFilter,
    actionTypesFilter,
    ruleExecutionStatusesFilter,
    ruleLastRunOutcomesFilter,
    ruleStatusesFilter,
    tagsFilter,
    sort,
    hasDefaultRuleTypesFiltersOn,
    onPage,
    onError,
  ]);

  return useMemo(
    () => ({
      rulesState: state.rulesState,
      noData: state.noData,
      initialLoad: state.initialLoad,
      loadRules: internalLoadRules,
      setRulesState,
    }),
    [state, setRulesState, internalLoadRules]
  );
}
