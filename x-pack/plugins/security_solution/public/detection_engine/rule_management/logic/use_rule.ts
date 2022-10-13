/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useRuleQuery } from '../api/hooks/use_rule_query';
import * as i18n from './translations';

/**
 * Hook for using to get a Rule from the Detection Engine API
 *
 * @param id desired Rule ID's (not rule_id)
 *
 */
export const useRule = (id: string) => {
  const { addError } = useAppToasts();

  return useRuleQuery(id, {
    onError: (error) => {
      addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
    },
  });
};
