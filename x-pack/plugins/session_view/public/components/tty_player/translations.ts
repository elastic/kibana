/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const PROCESS_DATA_LIMIT_EXCEEDED_START = i18n.translate(
  'xpack.sessionView.processDataLimitExceededStart',
  {
    defaultMessage: 'Data limit reached for',
  }
);

export const PROCESS_DATA_LIMIT_EXCEEDED_END = i18n.translate(
  'xpack.sessionView.processDataLimitExceededEnd',
  {
    defaultMessage: 'See "max_kilobytes_per_process" in advanced policy configuration.',
  }
);

export const VIEW_POLICIES = i18n.translate('xpack.sessionView.viewPoliciesLink', {
  defaultMessage: 'VIEW POLICIES',
});
