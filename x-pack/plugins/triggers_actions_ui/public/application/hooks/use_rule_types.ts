/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { loadRuleTypes } from '../lib/rule_api';
import { useKibana } from '../../common/lib/kibana';
import { RuleTypeIndex } from '../../types';

interface UseRuleTypesProps {
  onError: (message: string) => void;
  filteredRuleTypes: string[];
}

interface RuleTypeState {
  isLoading: boolean;
  isInitialized: boolean;
  data: RuleTypeIndex;
}

export function useRuleTypes({ onError, filteredRuleTypes }: UseRuleTypesProps): RuleTypeState {
  const { http } = useKibana().services;

  const queryFn = () => {
    return loadRuleTypes({ http });
  };

  const onErrorFn = () => {
    onError(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTypesMessage', {
        defaultMessage: 'Unable to load rule types',
      })
    );
  };

  const {
    data = [],
    isLoading,
    isInitialLoading,
  } = useQuery({
    queryKey: ['loadRuleTypes', filteredRuleTypes],
    queryFn,
    onError: onErrorFn,
  });

  const index: RuleTypeIndex = new Map();
  for (const ruleType of data) {
    index.set(ruleType.id, ruleType);
  }
  let filteredIndex = index;
  if (filteredRuleTypes && filteredRuleTypes.length > 0) {
    filteredIndex = new Map(
      [...index].filter(([k, v]) => {
        return filteredRuleTypes.includes(v.id);
      })
    );
  }

  return {
    isInitialized: isInitialLoading === false,
    isLoading,
    data: filteredIndex,
  };
}
