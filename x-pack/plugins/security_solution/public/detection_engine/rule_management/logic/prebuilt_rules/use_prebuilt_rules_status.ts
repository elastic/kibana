/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useFetchPrebuiltRulesStatusQueryNew } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query_new';
import * as i18n from '../translations';

export const usePrebuiltRulesStatus = () => {
  const { addError } = useAppToasts();

  return useFetchPrebuiltRulesStatusQueryNew({
    onError: (err) => {
      addError(err, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
    },
  });
};
