/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { RulesSettingsQueryDelayProperties } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { updateQueryDelaySettings } from '../lib/rule_api/update_query_delay_settings';

interface UseUpdateQueryDelaySettingsProps {
  onClose: () => void;
  onSave?: () => void;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
}

export const useUpdateQueryDelaySettings = (props: UseUpdateQueryDelaySettingsProps) => {
  const { onSave, onClose, setUpdatingRulesSettings } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = (queryDelaySettings: RulesSettingsQueryDelayProperties) => {
    return updateQueryDelaySettings({ http, queryDelaySettings });
  };

  return useMutation({
    mutationFn,
    onMutate: () => {
      onClose();
      setUpdatingRulesSettings?.(true);
    },
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate(
          'xpack.triggersActionsUI.rulesSettings.modal.updateRulesQueryDelaySettingsSuccess',
          {
            defaultMessage: 'Rules query delay settings updated successfully.',
          }
        )
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate(
          'xpack.triggersActionsUI.rulesSettings.modal.updateRulesQueryDelaySettingsFailure',
          {
            defaultMessage: 'Failed to update rules query delay settings.',
          }
        )
      );
    },
    onSettled: () => {
      setUpdatingRulesSettings?.(false);
      onSave?.();
    },
  });
};
