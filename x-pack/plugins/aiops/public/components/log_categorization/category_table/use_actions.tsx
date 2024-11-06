/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import type { Action } from '@elastic/eui/src/components/basic_table/action_types';

import { QUERY_MODE } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Filter } from '@kbn/es-query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { LogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';
import type { OpenInDiscover } from './use_open_in_discover';
import { useOpenInDiscover } from './use_open_in_discover';

export interface UseActions {
  getActions: (navigateToDiscover: boolean) => Array<Action<Category>>;
  openInDiscover: OpenInDiscover;
}

export function useActions(
  dataViewId: string,
  selectedField: DataViewField | string | undefined,
  selectedCategories: Category[],
  aiopsListState: LogCategorizationAppState,
  timefilter: TimefilterContract,
  onAddFilter?: (values: Filter, alias?: string) => void,
  additionalFilter?: CategorizationAdditionalFilter,
  onClose: () => void = () => {}
): UseActions {
  const openInDiscover = useOpenInDiscover(
    dataViewId,
    selectedField ?? undefined,
    selectedCategories,
    aiopsListState,
    timefilter,
    onAddFilter,
    additionalFilter
  );

  const { getLabels: getOpenInDiscoverLabels, openFunction: openInDiscoverFunction } =
    openInDiscover;

  const getActions = useCallback(
    (navigateToDiscover: boolean): Array<Action<Category>> => {
      const openInDiscoverLabels = getOpenInDiscoverLabels(navigateToDiscover);
      return [
        {
          name: openInDiscoverLabels.singleSelect.in,
          description: openInDiscoverLabels.singleSelect.in,
          icon: 'plusInCircle',
          type: 'icon',
          'data-test-subj': 'aiopsLogPatternsActionFilterInButton',
          onClick: (category) =>
            openInDiscoverFunction(QUERY_MODE.INCLUDE, navigateToDiscover, category),
        },
        {
          name: openInDiscoverLabels.singleSelect.out,
          description: openInDiscoverLabels.singleSelect.out,
          icon: 'minusInCircle',
          type: 'icon',
          'data-test-subj': 'aiopsLogPatternsActionFilterOutButton',
          onClick: (category) =>
            openInDiscoverFunction(QUERY_MODE.EXCLUDE, navigateToDiscover, category),
        },
      ];
    },
    [getOpenInDiscoverLabels, openInDiscoverFunction]
  );

  return { getActions, openInDiscover };
}
