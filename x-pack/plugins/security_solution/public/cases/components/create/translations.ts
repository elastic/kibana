/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    defaultMessage: 'External Connector Fields',
  }
);
