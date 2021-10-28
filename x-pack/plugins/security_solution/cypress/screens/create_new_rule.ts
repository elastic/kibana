/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ABOUT_CONTINUE_BTN = '[data-test-subj="about-continue"]';

export const ABOUT_EDIT_BUTTON = '[data-test-subj="edit-about-rule"]';

export const ABOUT_EDIT_TAB = '[data-test-subj="edit-rule-about-tab"]';

export const ACTIONS_EDIT_TAB = '[data-test-subj="edit-rule-actions-tab"]';

export const ACTIONS_THROTTLE_INPUT =
  '[data-test-subj="stepRuleActions"] [data-test-subj="select"]';

export const EMAIL_ACTION_BTN = '[data-test-subj=".email-ActionTypeSelectOption"]';

export const CREATE_ACTION_CONNECTOR_BTN = '[data-test-subj="createActionConnectorButton-0"]';

export const SAVE_ACTION_CONNECTOR_BTN = '[data-test-subj="saveActionButtonModal"]';

export const EMAIL_ACTION_TO_INPUT = '[data-test-subj="toEmailAddressInput"]';

export const EMAIL_ACTION_SUBJECT_INPUT = '[data-test-subj="subjectInput"]';

export const FROM_VALIDATION_ERROR = '.euiFormErrorText';

export const CONNECTOR_NAME_INPUT = '[data-test-subj="nameInput"]';

export const EMAIL_CONNECTOR_FROM_INPUT = '[data-test-subj="emailFromInput"]';

export const EMAIL_CONNECTOR_HOST_INPUT = '[data-test-subj="emailHostInput"]';

export const EMAIL_CONNECTOR_PORT_INPUT = '[data-test-subj="emailPortInput"]';

export const EMAIL_CONNECTOR_USER_INPUT = '[data-test-subj="emailUserInput"]';

export const EMAIL_CONNECTOR_PASSWORD_INPUT = '[data-test-subj="emailPasswordInput"]';

export const EMAIL_CONNECTOR_SERVICE_SELECTOR = '[data-test-subj="emailServiceSelectInput"]';

export const ADD_FALSE_POSITIVE_BTN =
  '[data-test-subj="detectionEngineStepAboutRuleFalsePositives"] .euiButtonEmpty__text';

export const ADD_REFERENCE_URL_BTN =
  '[data-test-subj="detectionEngineStepAboutRuleReferenceUrls"] .euiButtonEmpty__text';

export const ANOMALY_THRESHOLD_INPUT = '[data-test-subj="anomalyThresholdSlider"] .euiFieldNumber';

export const ADVANCED_SETTINGS_BTN = '[data-test-subj="advancedSettings"] .euiAccordion__button';

export const BACK_TO_ALL_RULES_LINK = '[data-test-subj="ruleDetailsBackToAllRules"]';

export const COMBO_BOX_CLEAR_BTN = '[data-test-subj="comboBoxClearButton"]';

export const COMBO_BOX_INPUT = '[data-test-subj="comboBoxInput"]';

export const CREATE_AND_ACTIVATE_BTN = '[data-test-subj="create-activate"]';

export const CUSTOM_QUERY_INPUT = '[data-test-subj="queryInput"]';

export const THREAT_MAPPING_COMBO_BOX_INPUT =
  '[data-test-subj="threatMatchInput"] [data-test-subj="fieldAutocompleteComboBox"]';

export const THREAT_MATCH_CUSTOM_QUERY_INPUT =
  '[data-test-subj="detectionEngineStepDefineRuleQueryBar"] [data-test-subj="queryInput"]';

export const THREAT_MATCH_QUERY_INPUT =
  '[data-test-subj="detectionEngineStepDefineThreatRuleQueryBar"] [data-test-subj="queryInput"]';

export const THREAT_MATCH_INDICATOR_INDEX =
  '[data-test-subj="detectionEngineStepDefineRuleIndices"] [data-test-subj="comboBoxInput"]';

export const THREAT_MATCH_INDICATOR_INDICATOR_INDEX =
  '[data-test-subj="detectionEngineStepDefineRuleThreatMatchIndices"] [data-test-subj="comboBoxInput"]';

export const THREAT_MATCH_AND_BUTTON = '[data-test-subj="andButton"]';

export const THREAT_ITEM_ENTRY_DELETE_BUTTON = '[data-test-subj="itemEntryDeleteButton"]';

export const THREAT_MATCH_OR_BUTTON = '[data-test-subj="orButton"]';

export const THREAT_COMBO_BOX_INPUT = '[data-test-subj="fieldAutocompleteComboBox"]';

export const INVALID_MATCH_CONTENT = 'All matches require both a field and threat index field.';

export const AT_LEAST_ONE_VALID_MATCH = 'At least one indicator match is required.';

export const AT_LEAST_ONE_INDEX_PATTERN = 'A minimum of one index pattern is required.';

export const CUSTOM_QUERY_REQUIRED = 'A custom query is required.';

export const DEFINE_CONTINUE_BUTTON = '[data-test-subj="define-continue"]';

export const DEFINE_EDIT_BUTTON = '[data-test-subj="edit-define-rule"]';

export const DEFINE_EDIT_TAB = '[data-test-subj="edit-rule-define-tab"]';

export const DEFINE_INDEX_INPUT =
  '[data-test-subj="detectionEngineStepDefineRuleIndices"] [data-test-subj="input"]';

export const EQL_TYPE = '[data-test-subj="eqlRuleType"]';

export const EQL_QUERY_INPUT = '[data-test-subj="eqlQueryBarTextInput"]';

export const EQL_QUERY_PREVIEW_HISTOGRAM = '[data-test-subj="queryPreviewEqlHistogram"]';

export const EQL_QUERY_VALIDATION_SPINNER = '[data-test-subj="eql-validation-loading"]';

export const IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK =
  '[data-test-subj="importQueryFromSavedTimeline"]';

export const INDICATOR_MATCH_TYPE = '[data-test-subj="threatMatchRuleType"]';

export const INPUT = '[data-test-subj="input"]';

export const INVESTIGATION_NOTES_TEXTAREA =
  '[data-test-subj="detectionEngineStepAboutRuleNote"] textarea';

export const FALSE_POSITIVES_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleFalsePositives"] input';

export const LOOK_BACK_INTERVAL =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="interval"]';

export const LOOK_BACK_TIME_TYPE =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="timeType"]';

export const MACHINE_LEARNING_DROPDOWN_INPUT =
  '[data-test-subj="mlJobSelect"] [data-test-subj="comboBoxInput"]';

export const MACHINE_LEARNING_TYPE = '[data-test-subj="machineLearningRuleType"]';

export const MITRE_TACTIC = '.euiContextMenuItem__text';

export const MITRE_ATTACK_TACTIC_DROPDOWN = '[data-test-subj="mitreAttackTactic"]';

export const MITRE_ATTACK_TECHNIQUE_DROPDOWN = '[data-test-subj="mitreAttackTechnique"]';

export const MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN = '[data-test-subj="mitreAttackSubtechnique"]';

export const MITRE_ATTACK_ADD_TACTIC_BUTTON = '[data-test-subj="addMitreAttackTactic"]';

export const MITRE_ATTACK_ADD_TECHNIQUE_BUTTON = '[data-test-subj="addMitreAttackTechnique"]';

export const MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON = '[data-test-subj="addMitreAttackSubtechnique"]';

export const PREVIEW_HEADER_SUBTITLE = '[data-test-subj="header-panel-subtitle"]';

export const QUERY_PREVIEW_BUTTON = '[data-test-subj="queryPreviewButton"]';

export const REFERENCE_URLS_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleReferenceUrls"] input';

export const REFRESH_BUTTON = '[data-test-subj="refreshButton"]';

export const DEFAULT_RISK_SCORE_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleRiskScore-defaultRiskRange"].euiRangeInput';

export const DEFAULT_RISK_SCORE_SLIDER =
  '[data-test-subj="detectionEngineStepAboutRuleRiskScore-defaultRiskRange"].euiRangeSlider';

export const RISK_MAPPING_OVERRIDE_OPTION = '#risk_score-mapping-override';

export const RISK_OVERRIDE =
  '[data-test-subj="detectionEngineStepAboutRuleRiskScore-riskOverride"]';

export const RULES_CREATION_FORM = '[data-test-subj="stepDefineRule"]';

export const RULES_CREATION_PREVIEW = '[data-test-subj="ruleCreationQueryPreview"]';

export const RULE_DESCRIPTION_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleDescription"] [data-test-subj="input"]';

export const RULE_NAME_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleName"] [data-test-subj="input"]';

export const RULE_NAME_OVERRIDE = '[data-test-subj="detectionEngineStepAboutRuleRuleNameOverride"]';

export const RULE_STATUS = '[data-test-subj="ruleStatus"]';

export const RULE_TIMESTAMP_OVERRIDE =
  '[data-test-subj="detectionEngineStepAboutRuleTimestampOverride"]';

export const RUNS_EVERY_INTERVAL =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="interval"]';

export const RUNS_EVERY_TIME_TYPE =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="timeType"]';

export const SCHEDULE_CONTINUE_BUTTON = '[data-test-subj="schedule-continue"]';

export const SCHEDULE_EDIT_TAB = '[data-test-subj="edit-rule-schedule-tab"]';

export const SCHEDULE_INTERVAL_AMOUNT_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="interval"]';

export const SCHEDULE_INTERVAL_UNITS_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleInterval"] [data-test-subj="timeType"]';

export const SCHEDULE_LOOKBACK_AMOUNT_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="interval"]';

export const SCHEDULE_LOOKBACK_UNITS_INPUT =
  '[data-test-subj="detectionEngineStepScheduleRuleFrom"] [data-test-subj="timeType"]';

export const SEVERITY_DROPDOWN =
  '[data-test-subj="detectionEngineStepAboutRuleSeverity"] [data-test-subj="select"]';

export const SEVERITY_MAPPING_OVERRIDE_OPTION = '#severity-mapping-override';

export const SEVERITY_OVERRIDE_ROW = '[data-test-subj="severityOverrideRow"]';

export const TAGS_FIELD =
  '[data-test-subj="detectionEngineStepAboutRuleTags"] [data-test-subj="comboBoxInput"]';

export const TAGS_INPUT =
  '[data-test-subj="detectionEngineStepAboutRuleTags"] [data-test-subj="comboBoxSearchInput"]';

export const TAGS_CLEAR_BUTTON =
  '[data-test-subj="detectionEngineStepAboutRuleTags"] [data-test-subj="comboBoxClearButton"]';

export const THRESHOLD_FIELD_SELECTION = '.euiFilterSelectItem';

export const THRESHOLD_INPUT_AREA = '[data-test-subj="thresholdInput"]';

export const THRESHOLD_TYPE = '[data-test-subj="thresholdRuleType"]';
