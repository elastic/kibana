/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { loadRuleTypes } from '../lib/rule_api';
import { useKibana } from '../../common/lib/kibana';
import { RuleTypeIndex } from '../../types';

interface UseLoadRuleTypesQueryProps {
  filteredRuleTypes: string[];
}

export const useLoadRuleTypesQuery = (props: UseLoadRuleTypesQueryProps) => {
  const { filteredRuleTypes } = props;
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return loadRuleTypes({ http });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTypesMessage', {
        defaultMessage: 'Unable to load rule types',
      })
    );
  };

  const { data, isSuccess, isFetching, isInitialLoading, isLoading } = useQuery({
    queryKey: ['loadRuleTypes'],
    queryFn,
    onError: onErrorFn,
  });

  let filteredIndex = new Map();
  if (data) {
    const index: RuleTypeIndex = new Map();
    for (const ruleType of data) {
      index.set(ruleType.id, ruleType);
    }
    let newFilteredIndex = index;
    if (filteredRuleTypes && filteredRuleTypes.length > 0) {
      newFilteredIndex = new Map(
        [...index].filter(([k, v]) => {
          return filteredRuleTypes.includes(v.id);
        })
      );
    }
    filteredIndex = newFilteredIndex;
  }

  const hasAnyAuthorizedRuleType = filteredIndex.size > 0;
  const authorizedRuleTypes = [...filteredIndex.values()];
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  return {
    ruleTypesState: {
      initialLoad: isLoading || isInitialLoading,
      isLoading: isLoading || isFetching,
      data: filteredIndex,
    },
    hasAnyAuthorizedRuleType,
    authorizedRuleTypes,
    authorizedToCreateAnyRules,
    isSuccess,
  };
};
