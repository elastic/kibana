/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { RulesSettingsFlapping } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { getFlappingSettings } from '../lib/rule_api/get_flapping_settings';

interface UseGetFlappingSettingsProps {
  enabled: boolean;
  onSuccess?: (settings: RulesSettingsFlapping) => void;
}

export const useGetFlappingSettings = (props: UseGetFlappingSettingsProps) => {
  const { enabled, onSuccess } = props;
  const { http } = useKibana().services;

  const queryFn = () => {
    return getFlappingSettings({ http });
  };

  const { data, isFetching, isError, isLoadingError, isLoading, isInitialLoading } = useQuery({
    queryKey: ['getFlappingSettings'],
    queryFn,
    onSuccess,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isInitialLoading,
    isLoading: isLoading || isFetching,
    isError: isError || isLoadingError,
    data,
  };
};
