/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublishPrebuiltRulesResponse } from '../../../../../common/api/detection_engine/prebuilt_rules/publish_prebuilt_rules/publish_prebuilt_rules.gen';
import * as i18n from './translations';
import { usePublishPrebuiltRulesMutation } from './use_publish_prebuilt_rules_mutation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

export const usePublishRules = () => {
  const { addError, addSuccess } = useAppToasts();

  return usePublishPrebuiltRulesMutation({
    onError: (err) => {
      addError(err, { title: i18n.PUBLISH_RULES_FAILED });
    },
    onSuccess: (result) => {
      addSuccess(getSuccessToastMessage(result));
    },
  });
};

const getSuccessToastMessage = (result: PublishPrebuiltRulesResponse) => {
  return i18n.PUBLISH_RULES_SUCCESS(result.published_rules?.length ?? 0);
};
