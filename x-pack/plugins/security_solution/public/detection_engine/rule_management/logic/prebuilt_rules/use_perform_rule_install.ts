/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useIsMutating } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  PERFORM_ALL_RULES_INSTALLATION_KEY,
  usePerformAllRulesInstallMutation,
} from '../../api/hooks/prebuilt_rules/use_perform_all_rules_install_mutation';
import {
  PERFORM_SPECIFIC_RULES_INSTALLATION_KEY,
  usePerformSpecificRulesInstallMutation,
} from '../../api/hooks/prebuilt_rules/use_perform_specific_rules_install_mutation';

// import * as i18n from './translations';

export const usePerformInstallAllRules = () => {
  const { addError, addSuccess } = useAppToasts();

  return usePerformAllRulesInstallMutation({
    onError: (err) => {
      addError(err, { title: 'Failed to install rules' });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result));
    },
  });
};

export const usePerformInstallSpecificRules = () => {
  const { addError, addSuccess } = useAppToasts();

  return usePerformSpecificRulesInstallMutation({
    onError: (err) => {
      addError(err, { title: 'Failed to install rules' });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result));
    },
  });
};

export const useIsPerformingAllRulesInstall = () => {
  const mutationsCount = useIsMutating(PERFORM_ALL_RULES_INSTALLATION_KEY);
  return mutationsCount > 0;
};

export const useIsPerformingSpecificRulesInstall = () => {
  const mutationsCount = useIsMutating(PERFORM_SPECIFIC_RULES_INSTALLATION_KEY);
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
    toastMessage += `${succeeded} rules installed successfully.`;
  }
  if (skipped > 0) {
    toastMessage += ` ${skipped} rules installation skipped.`;
  }
  if (failed > 0) {
    toastMessage += ` ${failed} rules installation failed.`;
  }
  return toastMessage;
};
