/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const READ_ONLY_FEATURE_TITLE = i18n.translate(
  'xpack.observability.cases.readOnlyFeatureTitle',
  {
    defaultMessage: 'You cannot open new or update existing cases',
  }
);

export const READ_ONLY_FEATURE_MSG = i18n.translate(
  'xpack.observability.cases.readOnlyFeatureDescription',
  {
    defaultMessage:
      'You only have privileges to view cases. If you need to open and update cases, contact your Kibana administrator.',
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.observability.cases.dismissErrorsPushServiceCallOutTitle',
  {
    defaultMessage: 'Dismiss',
  }
);
