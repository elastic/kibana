/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { RulesSettingsQueryDelay } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { getQueryDelaySettings } from '../lib/rule_api/get_query_delay_settings';

interface UseGetQueryDelaySettingsProps {
  enabled: boolean;
  onSuccess: (settings: RulesSettingsQueryDelay) => void;
}

export const useGetQueryDelaySettings = (props: UseGetQueryDelaySettingsProps) => {
  const { enabled, onSuccess } = props;
  const { http } = useKibana().services;

  const queryFn = () => {
    return getQueryDelaySettings({ http });
  };

  const { data, isFetching, isError, isLoadingError, isLoading } = useQuery({
    queryKey: ['getQueryDelaySettings'],
    queryFn,
    onSuccess,
    enabled,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    isLoading: isLoading || isFetching,
    isError: isError || isLoadingError,
    data,
  };
};
