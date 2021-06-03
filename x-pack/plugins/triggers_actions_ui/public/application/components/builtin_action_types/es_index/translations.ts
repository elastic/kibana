/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.error.requiredIndexText',
  {
    defaultMessage: 'Index is required.',
  }
);

export const DOCUMENT_NOT_VALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredDocumentJson',
  {
    defaultMessage: 'Document is required and should be a valid JSON object.',
  }
);

export const HISTORY_NOT_VALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.badIndexOverrideSuffix',
  {
    defaultMessage: 'Alert history index must contain valid suffix.',
  }
);
