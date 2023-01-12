/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { RulesSettingsFlappingProperties } from '@kbn/alerting-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { updateFlappingSettings } from '../lib/rule_api';

interface UseUpdateFlappingSettingsProps {
  onClose: () => void;
  onSave?: () => void;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
}

export const useUpdateFlappingSettings = (props: UseUpdateFlappingSettingsProps) => {
  const { onSave, onClose, setUpdatingRulesSettings } = props;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = (flappingSettings: RulesSettingsFlappingProperties) => {
    return updateFlappingSettings({ http, flappingSettings });
  };

  return useMutation({
    mutationFn,
    onMutate: () => {
      onClose();
      setUpdatingRulesSettings?.(true);
    },
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.updateRulesSettingsSuccess', {
          defaultMessage: 'Rules settings updated successfully.',
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.updateRulesSettingsFailure', {
          defaultMessage: 'Failed to update rules settings.',
        })
      );
    },
    onSettled: () => {
      setUpdatingRulesSettings?.(false);
      onSave?.();
    },
  });
};
