/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useIsMutating } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  PERFORM_ALL_RULES_UPGRADE_KEY,
  usePerformAllRulesUpgradeMutation,
} from '../../api/hooks/prebuilt_rules/use_perform_all_rules_upgrade_mutation';
import {
  PERFORM_SPECIFIC_RULES_UPGRADE_KEY,
  usePerformSpecificRulesUpgradeMutation,
} from '../../api/hooks/prebuilt_rules/use_perform_specific_rules_upgrade_mutation';

// import * as i18n from './translations';

export const usePerformUpgradeAllRules = () => {
  const { addError, addSuccess } = useAppToasts();

  return usePerformAllRulesUpgradeMutation({
    onError: (err) => {
      addError(err, { title: 'Failed to upgrade rules' });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result));
    },
  });
};

export const usePerformUpgradeSpecificRules = () => {
  const { addError, addSuccess } = useAppToasts();

  return usePerformSpecificRulesUpgradeMutation({
    onError: (err) => {
      addError(err, { title: 'Failed to upgrade selected rules' });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result));
    },
  });
};

export const useIsPerformingAllRulesUpgrade = () => {
  const mutationsCount = useIsMutating(PERFORM_ALL_RULES_UPGRADE_KEY);
  return mutationsCount > 0;
};

export const useIsPerformingSpecificRulesUpgrade = () => {
  const mutationsCount = useIsMutating(PERFORM_SPECIFIC_RULES_UPGRADE_KEY);
  return mutationsCount > 0;
};

const getSuccessToastMessage = (result: {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
}) => {
  let toastMessage: string = '';
  const {
    summary: { succeeded, skipped, failed },
  } = result;
  if (succeeded > 0) {
    toastMessage += `${succeeded} rules upgraded successfully.`;
  }
  if (skipped > 0) {
    toastMessage += ` ${skipped} rules upgrade skipped.`;
  }
  if (failed > 0) {
    toastMessage += ` ${failed} rules upgrade failed.`;
  }
  return toastMessage;
};
