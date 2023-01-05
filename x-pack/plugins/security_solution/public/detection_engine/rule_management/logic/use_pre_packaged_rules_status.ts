/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useFetchPrebuiltRulesStatusQuery } from '../api/hooks/use_fetch_prebuilt_rules_status_query';
import * as i18n from './translations';

export const usePrePackagedRulesStatus = () => {
  const { addError } = useAppToasts();

  return useFetchPrebuiltRulesStatusQuery({
    onError: (err) => {
      addError(err, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
    },
  });
};
