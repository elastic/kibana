/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../../../../../../../../common/translations';

export const DELETE_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.title',
  {
    defaultMessage: 'Delete inference endpoint',
  }
);

export const CONFIRM_DELETE_WARNING = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.confirmQuestion',
  {
    defaultMessage:
      'Deleting an active endpoint will cause operations targeting associated semantic_text fields and inference pipelines to fail.',
  }
);
