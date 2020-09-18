/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_BADGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.headerPage.pageBadgeLabel',
  {
    defaultMessage: 'Beta',
  }
);

export const PAGE_BADGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionEngine.headerPage.pageBadgeTooltip',
  {
    defaultMessage:
      'Alerts is still in beta. Please help us improve by reporting issues or bugs in the Kibana repo.',
  }
);
