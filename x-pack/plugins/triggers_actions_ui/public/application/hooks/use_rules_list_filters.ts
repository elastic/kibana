/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { RulesListFilters, RuleStatus } from '../../types';

export type SetFilterProps =
  | {
      filter: 'searchText';
      value: string;
    }
  | {
      filter: 'ruleStatuses';
      value: RuleStatus[];
    }
  | {
      filter: 'types' | 'actionTypes' | 'ruleExecutionStatuses' | 'ruleLastRunOutcomes' | 'tags';
      value: string[];
    };

interface UseRulesListFiltersProps {
  initialFilters: Partial<RulesListFilters>;
  onSetFilters: (props: SetFilterProps) => void;
}

const DEFAULT_INITIAL_FILTERS: RulesListFilters = {
  searchText: '',
  types: [],
  actionTypes: [],
  ruleExecutionStatuses: [],
  ruleLastRunOutcomes: [],
  ruleStatuses: [],
  tags: [],
};

export const useRulesListFilters = (props: UseRulesListFiltersProps) => {
  const { initialFilters, onSetFilters } = props;

  const [filters, setFilters] = useState<RulesListFilters>({
    ...DEFAULT_INITIAL_FILTERS,
    ...initialFilters,
  });

  const internalSetFilters = useCallback(
    (setFilterProps: SetFilterProps) => {
      const { filter, value } = setFilterProps;
      setFilters((prev) => ({
        ...prev,
        [filter]: value,
      }));

      onSetFilters(setFilterProps);
    },
    [setFilters, onSetFilters]
  );

  return {
    setFilter: internalSetFilters,
    filters,
  };
};
