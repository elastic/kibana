/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useUpdateRuleMutation } from '../api/hooks/use_update_rule_mutation';
import * as i18n from './translations';

export const useUpdateRule = () => {
  const { addError } = useAppToasts();

  return useUpdateRuleMutation({
    onError: (error) => {
      addError(error, { title: i18n.RULE_ADD_FAILURE });
    },
  });
};
