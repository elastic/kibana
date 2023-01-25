/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { RulesSettingsFlapping } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { getFlappingSettings } from '../lib/rule_api';

interface UseGetFlappingSettingsProps {
  enabled: boolean;
  onSuccess: (settings: RulesSettingsFlapping) => void;
}

export const useGetFlappingSettings = (props: UseGetFlappingSettingsProps) => {
  const { enabled, onSuccess } = props;
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return getFlappingSettings({ http });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.getRulesSettingsError', {
        defaultMessage: 'Failed to get rules Settings.',
      })
    );
  };

  const { data, isFetching, isError, isLoadingError, isLoading } = useQuery({
    queryKey: ['getFlappingSettings'],
    queryFn,
    onError: onErrorFn,
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
