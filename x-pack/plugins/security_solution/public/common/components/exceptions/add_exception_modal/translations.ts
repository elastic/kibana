/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate('xpack.securitySolution.exceptions.addException.cancel', {
  defaultMessage: 'Cancel',
});

export const ADD_EXCEPTION = i18n.translate(
  'xpack.securitySolution.exceptions.addException.addException',
  {
    defaultMessage: 'Add Exception',
  }
);

export const ADD_EXCEPTION_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.addException.error',
  {
    defaultMessage: 'Failed to add exception',
  }
);

export const ADD_EXCEPTION_SUCCESS = i18n.translate(
  'xpack.securitySolution.exceptions.addException.success',
  {
    defaultMessage: 'Successfully added exception',
  }
);

export const ADD_EXCEPTION_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.addException.fetchError.title',
  {
    defaultMessage: 'Error',
  }
);

export const ADD_EXCEPTION_FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.addException.fetchError',
  {
    defaultMessage: 'Error fetching exception list',
  }
);

export const ENDPOINT_QUARANTINE_TEXT = i18n.translate(
  'xpack.securitySolution.exceptions.addException.endpointQuarantineText',
  {
    defaultMessage:
      'Any file in quarantine on any endpoint that matches the attribute(s) selected will automatically be restored to its original location',
  }
);

export const BULK_CLOSE_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.addException.bulkCloseLabel',
  {
    defaultMessage: 'Close all alerts that match attributes in this exception',
  }
);

export const BULK_CLOSE_LABEL_DISABLED = i18n.translate(
  'xpack.securitySolution.exceptions.addException.bulkCloseLabel.disabled',
  {
    defaultMessage:
      'Close all alerts that match attributes in this exception (Lists and non-ECS fields are not supported)',
  }
);

export const EXCEPTION_BUILDER_INFO = i18n.translate(
  'xpack.securitySolution.exceptions.addException.infoLabel',
  {
    defaultMessage: "Alerts are generated when the rule's conditions are met, except when:",
  }
);
