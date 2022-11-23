/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { useGetFilteredRuleTypes } from './use_get_filtered_rule_types';

interface UseGetRuleTypeDefinitionFromRuleTypeProps {
  ruleTypeId: string | undefined;
}

export function useGetRuleTypeDefinitionFromRuleType({
  ruleTypeId,
}: UseGetRuleTypeDefinitionFromRuleTypeProps) {
  const filteredRuleTypes = useGetFilteredRuleTypes();

  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });

  return ruleTypes.find(({ id }) => id === ruleTypeId);
}
