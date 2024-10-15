/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENABLE_ENTITY_STORE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.title.store',
  {
    defaultMessage: 'Enable entity store',
  }
);
export const ENABLE_RISK_SCORE_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.title.risk',
  {
    defaultMessage: 'Enable Risk Score',
  }
);
export const ENABLE_ALL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.title.both',
  {
    defaultMessage: 'Enable Entity Store and Risk Score',
  }
);

export const ENABLEMENT_INITIALIZING_RISK_ENGINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.initializing.risk',
  {
    defaultMessage: 'Initializing Risk Engine',
  }
);

export const ENABLEMENT_INITIALIZING_ENTITY_STORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.initializing.store',
  {
    defaultMessage: 'Initializing Entity Store',
  }
);
