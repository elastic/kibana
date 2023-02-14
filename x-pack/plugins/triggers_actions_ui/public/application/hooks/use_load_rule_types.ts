/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useRef } from 'react';
import { loadRuleTypes } from '../lib/rule_api/rule_types';
import { RuleType, RuleTypeIndex } from '../../types';
import { useKibana } from '../../common/lib/kibana';

interface RuleTypesState {
  isLoading: boolean;
  data: Array<RuleType<string, string>>;
  error: string | null;
}

interface RuleTypesProps {
  filteredRuleTypes?: string[];
}

export function useLoadRuleTypes({ filteredRuleTypes }: RuleTypesProps) {
  const { http } = useKibana().services;
  const isMounted = useRef(false);
  const [ruleTypesState, setRuleTypesState] = useState<RuleTypesState>({
    isLoading: true,
    data: [],
    error: null,
  });
  const [ruleTypeIndex, setRuleTypeIndex] = useState<RuleTypeIndex>(new Map());

  async function fetchRuleTypes() {
    try {
      const response = await loadRuleTypes({ http });
      const index: RuleTypeIndex = new Map();
      for (const ruleTypeItem of response) {
        index.set(ruleTypeItem.id, ruleTypeItem);
      }
      if (isMounted.current) {
        setRuleTypeIndex(index);

        let filteredResponse = response;

        if (filteredRuleTypes && filteredRuleTypes.length > 0) {
          filteredResponse = response.filter((item) => filteredRuleTypes.includes(item.id));
        }
        setRuleTypesState({ ...ruleTypesState, isLoading: false, data: filteredResponse });
      }
    } catch (e) {
      if (isMounted.current) {
        setRuleTypesState({ ...ruleTypesState, isLoading: false, error: e });
      }
    }
  }

  useEffect(() => {
    isMounted.current = true;
    fetchRuleTypes();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ruleTypes: ruleTypesState.data,
    error: ruleTypesState.error,
    ruleTypeIndex,
    ruleTypesIsLoading: ruleTypesState.isLoading,
  };
}
