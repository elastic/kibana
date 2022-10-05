/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CHART_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.ecsGoalChart.chartTitle',
  {
    defaultMessage: 'The Security App Requires Elastic Common Schema',
  }
);

export const COMMON_CAUSES_INCLUDE = i18n.translate(
  'xpack.securitySolution.dataQuality.ecsGoalChart.commonCausesIncludedLegendText',
  {
    defaultMessage: 'Common causes include:',
  }
);

export const INDEX_MAPPING_CONFLICTS = i18n.translate(
  'xpack.securitySolution.dataQuality.ecsGoalChart.indexMappingConflictsLegendText',
  {
    defaultMessage: '- index mapping conflicts',
  }
);

export const ECS_COMPLIANCE_LABEL_MAJOR = i18n.translate(
  'xpack.securitySolution.dataQuality.ecsGoalChart.ecsComplianceLabelMajor',
  {
    defaultMessage: 'ECS Compliance',
  }
);

export const MISSING_TIMESTAMP = i18n.translate(
  'xpack.securitySolution.dataQuality.ecsGoalChart.missingTimestampLegendText',
  {
    defaultMessage: '- missing @timestamp field',
  }
);
