/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CUSTOM_QUERY_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customQueryFieldRequiredError',
  {
    defaultMessage: 'A custom query is required.',
  }
);

export const EQL_QUERY_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.eqlQueryFieldRequiredError',
  {
    defaultMessage: 'An EQL query is required.',
  }
);

export const ESQL_QUERY_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.esqlQueryFieldRequiredError',
  {
    defaultMessage: 'An ES|QL query is required.',
  }
);

export const INVALID_CUSTOM_QUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customQueryFieldInvalidError',
  {
    defaultMessage: 'The KQL is invalid',
  }
);

export const INDEX_HELPER_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.indicesHelperDescription',
  {
    defaultMessage:
      'Enter the pattern of Elasticsearch indices where you would like this rule to run. By default, these will include index patterns defined in Security Solution advanced settings.',
  }
);

export const RESET_DEFAULT_INDEX = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.resetDefaultIndicesButton',
  {
    defaultMessage: 'Reset to default index patterns',
  }
);

export const IMPORT_TIMELINE_QUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.importTimelineQueryButton',
  {
    defaultMessage: 'Import query from saved timeline',
  }
);

export const ML_JOB_SELECT_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.mlJobSelectPlaceholderText',
  {
    defaultMessage: 'Select a job',
  }
);

export const QUERY_BAR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldQuerBarLabel',
  {
    defaultMessage: 'Custom query',
  }
);

export const EQL_QUERY_BAR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.EqlQueryBarLabel',
  {
    defaultMessage: 'EQL query',
  }
);

export const SAVED_QUERY_FORM_ROW_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.SavedQueryFormRowLabel',
  {
    defaultMessage: 'Saved query',
  }
);

export const getSavedQueryCheckboxLabel = (savedQueryName: string) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldShouldLoadQueryDynamicallyLabel',
    {
      defaultMessage: 'Load saved query "{savedQueryName}" dynamically on each rule execution',
      values: { savedQueryName },
    }
  );

export const getSavedQueryCheckboxLabelWithoutName = () =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.fieldShouldLoadQueryDynamicallyLabelWithoutName',
    {
      defaultMessage: 'Load saved query dynamically on each rule execution',
    }
  );

export const THREAT_MATCH_INDEX_HELPER_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.threatMatchingIcesHelperDescription',
  {
    defaultMessage: 'Select threat indices',
  }
);

export const THREAT_MATCH_REQUIRED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customThreatQueryFieldRequiredError',
  {
    defaultMessage: 'At least one indicator match is required.',
  }
);

export const THREAT_MATCH_EMPTIES = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customThreatQueryFieldRequiredEmptyError',
  {
    defaultMessage: 'All matches require both a field and threat index field.',
  }
);

export const SOURCE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.source',
  {
    defaultMessage: 'Source',
  }
);

export const DATA_SOURCE_GUIDE_SUB_TITLE = i18n.translate(
  'xpack.securitySolution.detections.dataSource.popover.title',
  {
    defaultMessage: 'Select a data source',
  }
);

export const DATA_SOURCE_GUIDE_TITLE = i18n.translate(
  'xpack.securitySolution.detections.dataSource.popover.subTitle',
  {
    defaultMessage: 'Data sources',
  }
);

export const DATA_SOURCE_GUIDE_CONTENT = i18n.translate(
  'xpack.securitySolution.detections.dataSource.popover.content',
  {
    defaultMessage: 'Rules can now query index patterns or data views.',
  }
);

export const RULE_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.rulePreviewTitle',
  {
    defaultMessage: 'Rule Preview',
  }
);

export const ALERT_SUPPRESSION_MISSING_FIELDS_FORM_ROW_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionMissingFieldsLabel',
  {
    defaultMessage: 'If a suppression field is missing',
  }
);

export const ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS_OPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionMissingFieldsSuppressLabel',
  {
    defaultMessage: 'Suppress and group alerts for events with missing fields',
  }
);

export const ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS_OPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.alertSuppressionMissingFieldsDoNotSuppressLabel',
  {
    defaultMessage: 'Do not suppress alerts for events with missing fields',
  }
);

export const ESQL_QUERY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.esqlQueryLabel',
  {
    defaultMessage: 'ES|QL query',
  }
);

export const GROUP_BY_FIELD_LICENSE_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.groupBy.licenseWarning',
  {
    defaultMessage: 'Alert suppression is enabled with Platinum license or above',
  }
);
