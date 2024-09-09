/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OVERVIEW_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.overviewTabLabel',
  {
    defaultMessage: 'Overview',
  }
);

export const INVESTIGATION_GUIDE_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.investigationGuideTabLabel',
  {
    defaultMessage: 'Investigation guide',
  }
);

export const UPDATES_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.updatesTabLabel',
  {
    defaultMessage: 'Updates',
  }
);

export const JSON_VIEW_UPDATES_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.jsonViewUpdatesTabLabel',
  {
    defaultMessage: 'JSON view',
  }
);

export const DISMISS_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.dismissButtonLabel',
  {
    defaultMessage: 'Dismiss',
  }
);

export const ABOUT_SECTION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.aboutSectionLabel',
  {
    defaultMessage: 'About',
  }
);

export const DEFINITION_SECTION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.definitionSectionLabel',
  {
    defaultMessage: 'Definition',
  }
);

export const SCHEDULE_SECTION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.scheduleSectionLabel',
  {
    defaultMessage: 'Schedule',
  }
);

export const SETUP_GUIDE_SECTION_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.setupGuideSectionLabel',
  {
    defaultMessage: 'Setup guide',
  }
);

export const NAME_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.nameFieldLabel',
  {
    defaultMessage: 'Name',
  }
);

export const DESCRIPTION_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.descriptionFieldLabel',
  {
    defaultMessage: 'Description',
  }
);

export const AUTHOR_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.authorFieldLabel',
  {
    defaultMessage: 'Author',
  }
);

export const BUILDING_BLOCK_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.buildingBlockFieldLabel',
  {
    defaultMessage: 'Building block',
  }
);

export const BUILDING_BLOCK_FIELD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.buildingBlockFieldDescription',
  {
    defaultMessage: 'All generated alerts will be marked as "building block" alerts',
  }
);

export const SEVERITY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.severityFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const SEVERITY_MAPPING_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.severityMappingFieldLabel',
  {
    defaultMessage: 'Severity override',
  }
);

export const RISK_SCORE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.riskScoreFieldLabel',
  {
    defaultMessage: 'Risk score',
  }
);

export const RISK_SCORE_MAPPING_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.riskScoreMappingFieldLabel',
  {
    defaultMessage: 'Risk score override',
  }
);

export const REFERENCES_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.referencesFieldLabel',
  {
    defaultMessage: 'Reference URLs',
  }
);

export const FALSE_POSITIVES_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.falsePositivesFieldLabel',
  {
    defaultMessage: 'False positive examples',
  }
);

export const INVESTIGATION_FIELDS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.investigationFieldsFieldLabel',
  {
    defaultMessage: 'Custom highlighted fields',
  }
);

export const LICENSE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.licenseFieldLabel',
  {
    defaultMessage: 'License',
  }
);

export const RULE_NAME_OVERRIDE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleNameOverrideFieldLabel',
  {
    defaultMessage: 'Rule name override',
  }
);

export const THREAT_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatFieldLabel',
  {
    defaultMessage: 'MITRE ATT&CK\u2122',
  }
);

export const THREAT_INDICATOR_PATH_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatIndicatorPathFieldLabel',
  {
    defaultMessage: 'Indicator prefix override',
  }
);

export const TIMESTAMP_OVERRIDE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.timestampOverrideFieldLabel',
  {
    defaultMessage: 'Timestamp override',
  }
);

export const TAGS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.tagsFieldLabel',
  {
    defaultMessage: 'Tags',
  }
);

export const INDEX_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.indexFieldLabel',
  {
    defaultMessage: 'Index patterns',
  }
);

export const DATA_VIEW_ID_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.dataViewIdFieldLabel',
  {
    defaultMessage: 'Data view ID',
  }
);

export const DATA_VIEW_INDEX_PATTERN_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.dataViewIndexPatternFieldLabel',
  {
    defaultMessage: 'Data view index pattern',
  }
);

export const DATA_VIEW_INDEX_PATTERN_FETCH_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.dataViewIndexPatternFetchErrorMessage',
  {
    defaultMessage: 'Could not load data view index pattern',
  }
);

export const RULE_TYPE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleTypeFieldLabel',
  {
    defaultMessage: 'Rule type',
  }
);

export const THRESHOLD_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.thresholdFieldLabel',
  {
    defaultMessage: 'Threshold',
  }
);

export const MACHINE_LEARNING_JOB_ID_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.machineLearningJobIdFieldLabel',
  {
    defaultMessage: 'Machine Learning job',
  }
);

export const ANOMALY_THRESHOLD_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.anomalyThresholdFieldLabel',
  {
    defaultMessage: 'Anomaly score threshold',
  }
);

export const RELATED_INTEGRATIONS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.relatedIntegrationsFieldLabel',
  {
    defaultMessage: 'Related integrations',
  }
);

export const REQUIRED_FIELDS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.requiredFieldsFieldLabel',
  {
    defaultMessage: 'Required fields',
  }
);

export const TIMELINE_TITLE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.timelineTitleFieldLabel',
  {
    defaultMessage: 'Timeline template',
  }
);

export const THREAT_INDEX_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatIndexFieldLabel',
  {
    defaultMessage: 'Indicator index patterns',
  }
);

export const THREAT_MAPPING_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatMappingFieldLabel',
  {
    defaultMessage: 'Indicator mapping',
  }
);

export const THREAT_FILTERS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatFiltersFieldLabel',
  {
    defaultMessage: 'Indicator filters',
  }
);

export const SUPPRESS_ALERTS_BY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.suppressAlertsByFieldLabel',
  {
    defaultMessage: 'Suppress alerts by',
  }
);

export const SUPPRESS_ALERTS_DURATION_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.suppressAlertsForFieldLabel',
  {
    defaultMessage: 'Suppress alerts for',
  }
);

export const SUPPRESSION_FIELD_MISSING_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.suppressionFieldMissingFieldLabel',
  {
    defaultMessage: 'If a suppression field is missing',
  }
);

export const NEW_TERMS_FIELDS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.newTermsFieldsFieldLabel',
  {
    defaultMessage: 'Fields',
  }
);

export const HISTORY_WINDOW_SIZE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.historyWindowSizeFieldLabel',
  {
    defaultMessage: 'History Window Size',
  }
);

export const INTERVAL_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.intervalFieldLabel',
  {
    defaultMessage: 'Runs every',
  }
);

export const FROM_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.fromFieldLabel',
  {
    defaultMessage: 'Additional look-back time',
  }
);

export const MAX_SIGNALS_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.maxAlertsFieldLabel',
  {
    defaultMessage: 'Max alerts per run',
  }
);

export const CUSTOMIZED_PREBUILT_RULE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.customizedPrebuiltRuleLabel',
  {
    defaultMessage: 'Customized Elastic rule',
  }
);

export const QUERY_LANGUAGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.queryLanguageLabel',
  {
    defaultMessage: 'Custom query language',
  }
);

export const THREAT_QUERY_LANGUAGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.threatQueryLanguageLabel',
  {
    defaultMessage: 'Indicator index query language',
  }
);

export const SAVED_QUERY_LANGUAGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.savedQueryLanguageLabel',
  {
    defaultMessage: 'Saved query language',
  }
);

export const KUERY_LANGUAGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.kqlLanguageLabel',
  {
    defaultMessage: 'KQL',
  }
);

export const LUCENE_LANGUAGE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.luceneLanguageLabel',
  {
    defaultMessage: 'Lucene',
  }
);
