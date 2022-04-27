/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const RULE_LOAD_ERROR = (errorMessage: string) =>
  i18n.translate('xpack.observability.ruleDetails.ruleLoadError', {
    defaultMessage: 'Unable to load rule. Reason: {message}',
    values: { message: errorMessage },
  });

export const TAGS_TITLE = i18n.translate('xpack.observability.ruleDetails.tagsTitle', {
  defaultMessage: 'Tags',
});
