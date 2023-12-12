/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_TAGS_VALIDATION_ERROR = (duplicates: string) =>
  i18n.translate('xpack.securitySolution.api.alertTags.validationError', {
    values: { duplicates },
    defaultMessage:
      'Duplicate tags { duplicates } were found in the tags_to_add and tags_to_remove parameters.',
  });

export const NO_IDS_VALIDATION_ERROR = i18n.translate(
  'xpack.securitySolution.api.alertTags.noAlertIds',
  {
    defaultMessage: 'No alert ids were provided',
  }
);

export const ALERT_ASSIGNEES_VALIDATION_ERROR = (duplicates: string) =>
  i18n.translate('xpack.securitySolution.api.alertAssignees.validationError', {
    values: { duplicates },
    defaultMessage:
      'Duplicate assignees { duplicates } were found in the add and remove parameters.',
  });
