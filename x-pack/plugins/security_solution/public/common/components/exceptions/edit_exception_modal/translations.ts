/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate('xpack.securitySolution.exceptions.editException.cancel', {
  defaultMessage: 'Cancel',
});

export const EDIT_EXCEPTION_SAVE_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.editException.editExceptionSaveButton',
  {
    defaultMessage: 'Save',
  }
);

export const EDIT_EXCEPTION_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.editException.editExceptionTitle',
  {
    defaultMessage: 'Edit Exception',
  }
);

export const EDIT_EXCEPTION_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.editException.error',
  {
    defaultMessage: 'Failed to update exception',
  }
);

export const EDIT_EXCEPTION_SUCCESS = i18n.translate(
  'xpack.securitySolution.exceptions.editException.success',
  {
    defaultMessage: 'Successfully updated exception',
  }
);

export const BULK_CLOSE_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.editException.bulkCloseLabel',
  {
    defaultMessage: 'Close all alerts that match attributes in this exception',
  }
);

export const BULK_CLOSE_LABEL_DISABLED = i18n.translate(
  'xpack.securitySolution.exceptions.editException.bulkCloseLabel.disabled',
  {
    defaultMessage:
      'Close all alerts that match attributes in this exception (Lists and non-ECS fields are not supported)',
  }
);

export const ENDPOINT_QUARANTINE_TEXT = i18n.translate(
  'xpack.securitySolution.exceptions.editException.endpointQuarantineText',
  {
    defaultMessage:
      'Any file in quarantine on any endpoint that matches the attribute(s) selected will automatically be restored to its original location',
  }
);

export const EXCEPTION_BUILDER_INFO = i18n.translate(
  'xpack.securitySolution.exceptions.editException.infoLabel',
  {
    defaultMessage: "Alerts are generated when the rule's conditions are met, except when:",
  }
);
