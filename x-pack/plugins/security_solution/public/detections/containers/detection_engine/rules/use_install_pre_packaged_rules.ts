/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMutation } from 'react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { createPrepackagedRules } from './api';
import * as i18n from './translations';
import { useInvalidateRules } from './use_find_rules_query';
import { useInvalidatePrePackagedRulesStatus } from './use_pre_packaged_rules_status';

export const useInstallPrePackagedRules = () => {
  const { addError, addSuccess } = useAppToasts();
  const invalidateRules = useInvalidateRules();
  const invalidatePrePackagedRulesStatus = useInvalidatePrePackagedRulesStatus();

  return useMutation(() => createPrepackagedRules(), {
    onError: (err) => {
      addError(err, { title: i18n.RULE_AND_TIMELINE_PREPACKAGED_FAILURE });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result));
      // Always invalidate all rules and the prepackaged rules status cache as
      // the number of rules might change after the installation
      invalidatePrePackagedRulesStatus();
      invalidateRules();
    },
  });
};

const getSuccessToastMessage = (result: {
  rules_installed: number;
  rules_updated: number;
  timelines_installed: number;
  timelines_updated: number;
}) => {
  const {
    rules_installed: rulesInstalled,
    rules_updated: rulesUpdated,
    timelines_installed: timelinesInstalled,
    timelines_updated: timelinesUpdated,
  } = result;
  if (rulesInstalled === 0 && (timelinesInstalled > 0 || timelinesUpdated > 0)) {
    return i18n.TIMELINE_PREPACKAGED_SUCCESS;
  } else if ((rulesInstalled > 0 || rulesUpdated > 0) && timelinesInstalled === 0) {
    return i18n.RULE_PREPACKAGED_SUCCESS;
  } else {
    return i18n.RULE_AND_TIMELINE_PREPACKAGED_SUCCESS;
  }
};
