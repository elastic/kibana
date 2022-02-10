/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_FEATURE_NO_PERMISSIONS_TITLE = i18n.translate(
  'xpack.observability.cases.caseFeatureNoPermissionsTitle',
  {
    defaultMessage: 'Kibana feature privileges required',
  }
);

export const CASES_FEATURE_NO_PERMISSIONS_MSG = i18n.translate(
  'xpack.observability.cases.caseFeatureNoPermissionsMessage',
  {
    defaultMessage:
      'To view cases, you must have privileges for the Cases feature in the Kibana space. For more information, contact your Kibana administrator.',
  }
);

export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.observability.cases.caseView.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);
