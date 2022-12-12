/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { loadRuleTags } from '../lib/rule_api';
import { useKibana } from '../../common/lib/kibana';
import { useRuleTypes } from './use_rule_types';

interface UseLoadTagsProps {
  onError: (message: string) => void;
  filteredRuleTypes: string[];
  authorizedToCreateAnyRules: boolean;
}

export function useLoadTags({
  onError,
  filteredRuleTypes,
  authorizedToCreateAnyRules,
}: UseLoadTagsProps) {
  const { http } = useKibana().services;
  const ruleTypesState = useRuleTypes({ onError, filteredRuleTypes });

  const queryFn = () => {
    return loadRuleTags({ http });
  };

  const onErrorFn = () => {
    onError(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTags', {
        defaultMessage: 'Unable to load rule tags',
      })
    );
  };

  const { refetch, data } = useQuery({
    queryKey: ['loadRuleTags'],
    queryFn,
    enabled: authorizedToCreateAnyRules && ruleTypesState.isInitialized,
    onError: onErrorFn,
  });

  return {
    tags: data?.ruleTags ?? [],
    loadTags: refetch,
  };
}
