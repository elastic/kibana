/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useLoadRuleTypesQuery as useLoadRuleTypesQueryShared } from '@kbn/alerts-ui-shared';
import { useKibana } from '../../common/lib/kibana';

interface UseLoadRuleTypesQueryProps {
  filteredRuleTypes: string[];
  enabled?: boolean;
}

export const useLoadRuleTypesQuery = (props: UseLoadRuleTypesQueryProps) => {
  const { filteredRuleTypes, enabled = true } = props;
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useLoadRuleTypesQueryShared({
    filteredRuleTypes,
    enabled,
    http,
    toasts,
  });
};
