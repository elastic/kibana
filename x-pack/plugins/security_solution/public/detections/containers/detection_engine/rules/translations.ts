/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_FROM_TIMELINE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.fromTimelineErrorTitle',
  {
    defaultMessage: 'Error creating rule from saved timeline',
  }
);

export const RULE_FROM_TIMELINE_ERROR_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.fromTimelineErrorAction',
  {
    defaultMessage: "update the timeline's data view",
  }
);
