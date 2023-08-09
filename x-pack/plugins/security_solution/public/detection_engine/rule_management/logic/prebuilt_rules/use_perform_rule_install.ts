/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { usePerformAllRulesInstallMutation } from '../../api/hooks/prebuilt_rules/use_perform_all_rules_install_mutation';
import { usePerformSpecificRulesInstallMutation } from '../../api/hooks/prebuilt_rules/use_perform_specific_rules_install_mutation';

import * as i18n from './translations';

export const usePerformInstallAllRules = () => {
  const { addError, addSuccess } = useAppToasts();

  return usePerformAllRulesInstallMutation({
    onError: (err) => {
      addError(err, { title: i18n.RULE_INSTALLATION_FAILED });
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
      addError(err, { title: i18n.RULE_INSTALLATION_FAILED });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result));
    },
  });
};

const getSuccessToastMessage = (result: {
  summary: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
}) => {
  const toastMessages: string[] = [];
  const {
    summary: { succeeded, skipped, failed },
  } = result;
  if (succeeded > 0) {
    toastMessages.push(i18n.INSTALL_RULE_SUCCESS(succeeded));
  }
  if (skipped > 0) {
    toastMessages.push(i18n.INSTALL_RULE_SKIPPED(skipped));
  }
  if (failed > 0) {
    toastMessages.push(i18n.INSTALL_RULE_FAILED(failed));
  }
  return toastMessages.join(' ');
};
