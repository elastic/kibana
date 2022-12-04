/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useFetchRulesInfoQuery } from '../api/hooks/use_fetch_rules_info_query';
import * as i18n from './translations';

export const useRulesInfo = () => {
  const { addError } = useAppToasts();

  return useFetchRulesInfoQuery({
    onError: (err) => {
      addError(err, { title: i18n.RULES_INFO_FETCH_FAILURE });
    },
  });
};
