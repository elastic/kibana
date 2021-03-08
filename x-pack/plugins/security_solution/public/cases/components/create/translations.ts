/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../translations';

export const STEP_ONE_TITLE = i18n.translate(
  'xpack.securitySolution.components.create.stepOneTitle',
  {
    defaultMessage: 'Case fields',
  }
);

export const STEP_TWO_TITLE = i18n.translate(
  'xpack.securitySolution.components.create.stepTwoTitle',
  {
    defaultMessage: 'Case settings',
  }
);

export const STEP_THREE_TITLE = i18n.translate(
  'xpack.securitySolution.components.create.stepThreeTitle',
  {
    defaultMessage: 'External Connector Fields',
  }
);

export const SYNC_ALERTS_LABEL = i18n.translate(
  'xpack.securitySolution.components.create.syncAlertsLabel',
  {
    defaultMessage: 'Sync alert status with case status',
  }
);
