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
    defaultMessage: 'Enable entity risk score',
  }
);
export const ENABLE_ALL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.title.both',
  {
    defaultMessage: 'Enable entity store and risk score',
  }
);

export const ENABLEMENT_INITIALIZING_RISK_ENGINE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.initializing.risk',
  {
    defaultMessage: 'Initializing risk engine',
  }
);

export const ENABLEMENT_INITIALIZING_ENTITY_STORE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.initializing.store',
  {
    defaultMessage: 'Initializing entity store',
  }
);

export const ENABLEMENT_DESCRIPTION_RISK_ENGINE_ONLY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.description.risk',
  {
    defaultMessage:
      'Provides real-time visibility into user activity, helping you identify and mitigate potential security risks.',
  }
);

export const ENABLEMENT_DESCRIPTION_ENTITY_STORE_ONLY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.description.store',
  {
    defaultMessage: "Allows comprehensive monitoring of your system's hosts and users.",
  }
);

export const ENABLEMENT_DESCRIPTION_BOTH = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enablement.description.both',
  {
    defaultMessage:
      'Your entity store is currently empty. Add information about your entities directly from your logs, or import them using a text file.',
  }
);
