/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ISOLATE_HOST = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.isolateHost.isolateHost',
  {
    defaultMessage: 'Isolate host',
  }
);

export const COMMENT = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.comment', {
  defaultMessage: 'Comment',
});

export const COMMENT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.comment.placeholder',
  { defaultMessage: 'You may leave an optional note here.' }
);

export const CANCEL = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.cancel', {
  defaultMessage: 'Cancel',
});

export const CONFIRM = i18n.translate('xpack.securitySolution.endpoint.hostIsolation.confirm', {
  defaultMessage: 'Confirm',
});

export const CASES_ASSOCIATED_WITH_ALERT = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.isolateHost.casesAssociatedWihtAlert',
  {
    defaultMessage: ' cases associated with the rule ',
  }
);

export const RETURN_TO_ALERT_DETAILS = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.returnToAlertDetails',
  { defaultMessage: 'Return to alert details' }
);
