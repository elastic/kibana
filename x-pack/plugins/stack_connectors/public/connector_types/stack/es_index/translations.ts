/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_IS_NOT_VALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.error.notValidIndexText',
  {
    defaultMessage: 'Index is not valid.',
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

export const EXECUTION_TIME_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.executionTimeFieldLabel',
  {
    defaultMessage: 'Time field',
  }
);

export const SHOW_TIME_FIELD_TOGGLE_TOOLTIP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.definedateFieldTooltip',
  {
    defaultMessage: `Set this time field to the time the document was indexed.`,
  }
);

export const REFRESH_FIELD_TOGGLE_TOOLTIP = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.refreshTooltip',
  {
    defaultMessage: 'Refresh the affected shards to make this operation visible to search.',
  }
);

export const INDEX_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indicesToQueryLabel',
  {
    defaultMessage: 'Index',
  }
);
