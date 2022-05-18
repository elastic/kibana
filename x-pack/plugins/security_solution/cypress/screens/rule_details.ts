/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALL_ACTIONS = '[data-test-subj="rules-details-popover-button-icon"]';

export const ABOUT_INVESTIGATION_NOTES = '[data-test-subj="stepAboutDetailsNoteContent"]';

export const ABOUT_RULE_DESCRIPTION = '[data-test-subj=stepAboutRuleDetailsToggleDescriptionText]';

export const ABOUT_DETAILS =
  '[data-test-subj="aboutRule"] [data-test-subj="listItemColumnStepRuleDescription"]';

export const ADDITIONAL_LOOK_BACK_DETAILS = 'Additional look-back time';

export const ALERTS_TAB = '[data-test-subj="alertsTab"]';

export const ANOMALY_SCORE_DETAILS = 'Anomaly score';

export const CUSTOM_QUERY_DETAILS = 'Custom query';

export const DEFINITION_DETAILS =
  '[data-test-subj=definitionRule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const DELETE_RULE = '[data-test-subj=rules-details-delete-rule]';

export const DETAILS_DESCRIPTION = '.euiDescriptionList__description';

export const DETAILS_TITLE = '.euiDescriptionList__title';

export const EXCEPTIONS_TAB = '[data-test-subj="exceptionsTab"]';

export const EXCEPTIONS_TAB_SEARCH = '[data-test-subj="exceptionsHeaderSearch"]';

export const FALSE_POSITIVES_DETAILS = 'False positive examples';

export const INDEX_PATTERNS_DETAILS = 'Index patterns';

export const INDICATOR_INDEX_PATTERNS = 'Indicator index patterns';

export const INDICATOR_INDEX_QUERY = 'Indicator index query';

export const INDICATOR_MAPPING = 'Indicator mapping';

export const INVESTIGATION_NOTES_MARKDOWN = 'test markdown';

export const INVESTIGATION_NOTES_TOGGLE = '[data-test-subj="stepAboutDetailsToggle-notes"]';

export const MACHINE_LEARNING_JOB_ID = '[data-test-subj="machineLearningJobId"]';

export const MACHINE_LEARNING_JOB_STATUS = '[data-test-subj="machineLearningJobStatus"]';

export const MITRE_ATTACK_DETAILS = 'MITRE ATT&CK';

export const FIELDS_BROWSER_BTN =
  '[data-test-subj="events-viewer-panel"] [data-test-subj="show-field-browser"]';

export const REFRESH_BUTTON = '[data-test-subj="refreshButton"]';

export const RULE_NAME_HEADER = '[data-test-subj="header-page-title"]';

export const RULE_NAME_OVERRIDE_DETAILS = 'Rule name override';

export const RISK_SCORE_DETAILS = 'Risk score';

export const INDICATOR_PREFIX_OVERRIDE = 'Indicator prefix override';

export const RISK_SCORE_OVERRIDE_DETAILS = 'Risk score override';

export const REFERENCE_URLS_DETAILS = 'Reference URLs';

export const REMOVE_EXCEPTION_BTN = '[data-test-subj="exceptionsViewerDeleteBtn"]';

export const RULE_SWITCH = '[data-test-subj="ruleSwitch"]';

export const RULE_SWITCH_LOADER = '[data-test-subj="rule-switch-loader"]';

export const RULE_TYPE_DETAILS = 'Rule type';

export const RUNS_EVERY_DETAILS = 'Runs every';

export const SCHEDULE_DETAILS =
  '[data-test-subj=schedule] [data-test-subj="listItemColumnStepRuleDescription"]';

export const SEVERITY_DETAILS = 'Severity';

export const TAGS_DETAILS = 'Tags';

export const THRESHOLD_DETAILS = 'Threshold';

export const TIMELINE_TEMPLATE_DETAILS = 'Timeline template';

export const TIMESTAMP_OVERRIDE_DETAILS = 'Timestamp override';

export const TIMELINE_FIELD = (field: string) => {
  return `[data-test-subj="formatted-field-${field}"]`;
};

export const removeExternalLinkText = (str: string) =>
  str.replace(/\(opens in a new tab or window\)/g, '');

export const BACK_TO_RULES = '[data-test-subj="ruleDetailsBackToAllRules"]';
