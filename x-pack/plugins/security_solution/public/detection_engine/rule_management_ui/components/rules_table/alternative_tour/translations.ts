/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_RULE_TOUR_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.tour.createRuleTourTitle',
  {
    defaultMessage: 'New security rule features are available',
  }
);

export const CREATE_RULE_TOUR_CONTENT = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.tour.createRuleTourContent',
  {
    defaultMessage: `Alert suppression options are now available for Custom Query rules and multiple fields can be selected in New Terms rules`,
  }
);
