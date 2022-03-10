/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { loadRuleTypes } from '../lib/rule_api';
import { RuleType } from '../../types';
import { useKibana } from '../../common/lib/kibana';

interface RuleTypesState {
  isLoading: boolean;
  data: Array<RuleType<string, string>>;
  error: string | null;
}

interface RuleTypesProps {
  filteredSolutions?: string[] | undefined;
}

export function useLoadRuleTypes({ filteredSolutions }: RuleTypesProps) {
  const { http } = useKibana().services;

  const [ruleTypesState, setRuleTypesState] = useState<RuleTypesState>({
    isLoading: false,
    data: [],
    error: null,
  });
  async function fetchRuleTypes() {
    setRuleTypesState({ ...ruleTypesState, isLoading: true });
    try {
      const response = await loadRuleTypes({ http });
      let filteredResponse = response;

      if (filteredSolutions && filteredSolutions.length > 0) {
        filteredResponse = response.filter((item) => filteredSolutions.includes(item.producer));
      }
      setRuleTypesState({ ...ruleTypesState, isLoading: false, data: filteredResponse });
    } catch (e) {
      setRuleTypesState({ ...ruleTypesState, isLoading: false, error: e });
    }
  }

  useEffect(() => {
    fetchRuleTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // return availableRuleTypes, solutions, index
  return {
    ruleTypes: ruleTypesState.data,
  };
}
