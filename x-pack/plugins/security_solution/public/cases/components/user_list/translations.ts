/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SEND_EMAIL_ARIA = (user: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.sendEmalLinkAria', {
    values: { user },
    defaultMessage: 'click to send an email to {user}',
  });
