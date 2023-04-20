/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { loadRuleTypes } from '../lib/rule_api/rule_types';
import { useKibana } from '../../common/lib/kibana';
import { RuleType, RuleTypeIndex } from '../../types';

interface UseLoadRuleTypesQueryProps {
  filteredRuleTypes: string[];
  enabled?: boolean;
}

const getFilteredIndex = (
  data: Array<RuleType<string, string>> = [],
  filteredRuleTypes: string[]
) => {
  const unfilteredRuleTypeIndex: RuleTypeIndex = new Map();

  for (const ruleType of data) {
    unfilteredRuleTypeIndex.set(ruleType.id, ruleType);
  }

  const filteredRuleTypeIndex = filteredRuleTypes?.length
    ? new Map(
        [...unfilteredRuleTypeIndex].filter(([k, v]) => {
          return filteredRuleTypes.includes(v.id);
        })
      )
    : unfilteredRuleTypeIndex;

  return { unfilteredRuleTypeIndex, filteredRuleTypeIndex };
};

export const useLoadRuleTypesQuery = ({
  filteredRuleTypes,
  enabled = true,
}: UseLoadRuleTypesQueryProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = async () => {
    return await loadRuleTypes({ http });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTypesMessage', {
        defaultMessage: 'Unable to load rule types',
      })
    );
  };

  const { data, isSuccess, isFetching, isInitialLoading, isLoading, isError } = useQuery({
    queryKey: ['loadRuleTypes'],
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    enabled,
  });
  const ruleTypes = data ? data.filter((item) => filteredRuleTypes.includes(item.id)) : [];

  const { filteredRuleTypeIndex, unfilteredRuleTypeIndex } = getFilteredIndex(
    data,
    filteredRuleTypes
  );

  const hasAnyAuthorizedRuleType = filteredRuleTypeIndex.size > 0;
  const authorizedRuleTypes = [...filteredRuleTypeIndex.values()];
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  return {
    ruleTypesState: {
      initialLoad: isLoading || isInitialLoading,
      isLoading: isLoading || isFetching,
      isError,
      isSuccess,
      filteredRuleTypeIndex,
      unfilteredRuleTypeIndex,
      ruleTypes,
    },
    hasAnyAuthorizedRuleType,
    authorizedRuleTypes,
    authorizedToCreateAnyRules,
  };
};
