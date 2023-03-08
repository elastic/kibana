/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, parseInt } from 'lodash';

import type {
  RuleIntervalFrom,
  Threat,
  ThreatSubtechnique,
  ThreatTechnique,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { Actions } from '../objects/rule';
// For some reason importing these functions from ../../public/detections/pages/detection_engine/rules/helpers
// causes a "Webpack Compilation Error" in this file specifically, even though it imports fine in the test files
// in ../e2e/*, so we have a copy of the implementations in the cypress helpers.
import { convertHistoryStartToSize, getHumanizedDuration } from '../helpers/rules';

import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_TAB,
  ACTIONS_EDIT_TAB,
  ADD_FALSE_POSITIVE_BTN,
  ADD_REFERENCE_URL_BTN,
  ADVANCED_SETTINGS_BTN,
  ANOMALY_THRESHOLD_INPUT,
  APPLY_SELECTED_SAVED_QUERY_BUTTON,
  AT_LEAST_ONE_INDEX_PATTERN,
  AT_LEAST_ONE_VALID_MATCH,
  COMBO_BOX_CLEAR_BTN,
  CREATE_AND_ENABLE_BTN,
  CUSTOM_QUERY_INPUT,
  CUSTOM_QUERY_REQUIRED,
  DEFAULT_RISK_SCORE_INPUT,
  DEFINE_CONTINUE_BUTTON,
  EQL_QUERY_INPUT,
  EQL_QUERY_VALIDATION_SPINNER,
  EQL_TYPE,
  FALSE_POSITIVES_INPUT,
  IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK,
  INDICATOR_MATCH_TYPE,
  INPUT,
  INVALID_MATCH_CONTENT,
  INVESTIGATION_NOTES_TEXTAREA,
  LOAD_QUERY_DYNAMICALLY_CHECKBOX,
  LOAD_SAVED_QUERIES_LIST_BUTTON,
  LOOK_BACK_INTERVAL,
  LOOK_BACK_TIME_TYPE,
  MACHINE_LEARNING_DROPDOWN_INPUT,
  MACHINE_LEARNING_TYPE,
  MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON,
  MITRE_ATTACK_ADD_TACTIC_BUTTON,
  MITRE_ATTACK_ADD_TECHNIQUE_BUTTON,
  MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN,
  MITRE_ATTACK_TACTIC_DROPDOWN,
  MITRE_ATTACK_TECHNIQUE_DROPDOWN,
  MITRE_TACTIC,
  QUERY_BAR,
  REFERENCE_URLS_INPUT,
  REFRESH_BUTTON,
  RISK_MAPPING_OVERRIDE_OPTION,
  RISK_OVERRIDE,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  RULE_NAME_OVERRIDE,
  RULE_STATUS,
  RULE_TIMESTAMP_OVERRIDE,
  RULES_CREATION_FORM,
  RULES_CREATION_PREVIEW_BUTTON,
  RULES_CREATION_PREVIEW_REFRESH_BUTTON,
  RUNS_EVERY_INTERVAL,
  RUNS_EVERY_TIME_TYPE,
  savedQueryByName,
  SCHEDULE_CONTINUE_BUTTON,
  SCHEDULE_EDIT_TAB,
  SEVERITY_DROPDOWN,
  SEVERITY_MAPPING_OVERRIDE_OPTION,
  SEVERITY_OVERRIDE_ROW,
  SHOW_QUERY_BAR_BUTTON,
  TAGS_INPUT,
  THREAT_COMBO_BOX_INPUT,
  THREAT_ITEM_ENTRY_DELETE_BUTTON,
  THREAT_MAPPING_COMBO_BOX_INPUT,
  THREAT_MATCH_AND_BUTTON,
  THREAT_MATCH_CUSTOM_QUERY_INPUT,
  THREAT_MATCH_INDICATOR_INDEX,
  THREAT_MATCH_INDICATOR_INDICATOR_INDEX,
  THREAT_MATCH_OR_BUTTON,
  THREAT_MATCH_QUERY_INPUT,
  THRESHOLD_INPUT_AREA,
  THRESHOLD_TYPE,
  PREVIEW_HISTOGRAM,
  DATA_VIEW_COMBO_BOX,
  DATA_VIEW_OPTION,
  NEW_TERMS_TYPE,
  NEW_TERMS_HISTORY_SIZE,
  NEW_TERMS_HISTORY_TIME_TYPE,
  NEW_TERMS_INPUT_AREA,
  ACTIONS_THROTTLE_INPUT,
  CONTINUE_BUTTON,
  CREATE_WITHOUT_ENABLING_BTN,
  RULE_INDICES,
  ALERTS_INDEX_BUTTON,
} from '../screens/create_new_rule';
import {
  INDEX_SELECTOR,
  CREATE_ACTION_CONNECTOR_BTN,
  EMAIL_ACTION_BTN,
} from '../screens/common/rule_actions';
import { fillIndexConnectorForm, fillEmailConnectorForm } from './common/rule_actions';
import { TOAST_ERROR } from '../screens/shared';
import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';
import { TIMELINE } from '../screens/timelines';
import { refreshPage } from './security_header';
import { EUI_FILTER_SELECT_ITEM, COMBO_BOX_INPUT } from '../screens/common/controls';
import { ruleFields } from '../data/detection_engine';
import { BACK_TO_RULES_TABLE } from '../screens/rule_details';
import type {
  EqlRuleCreateProps,
  MachineLearningRuleCreateProps,
  NewTermsRuleCreateProps,
  QueryRuleCreateProps,
  RuleCreateProps,
  ThreatMatchRuleCreateProps,
  ThresholdRuleCreateProps,
} from '../../common/detection_engine/rule_schema';

export const createAndEnableRule = () => {
  cy.get(CREATE_AND_ENABLE_BTN).click({ force: true });
  cy.get(CREATE_AND_ENABLE_BTN).should('not.exist');
  cy.get(BACK_TO_RULES_TABLE).click({ force: true });
  cy.get(BACK_TO_RULES_TABLE).should('not.exist');
};

export const createRuleWithoutEnabling = () => {
  cy.get(CREATE_WITHOUT_ENABLING_BTN).click({ force: true });
  cy.get(CREATE_WITHOUT_ENABLING_BTN).should('not.exist');
  cy.get(BACK_TO_RULES_TABLE).click({ force: true });
  cy.get(BACK_TO_RULES_TABLE).should('not.exist');
};

export const fillAboutRule = (rule: RuleCreateProps) => {
  cy.get(RULE_NAME_INPUT).clear({ force: true }).type(rule.name, { force: true });
  cy.get(RULE_DESCRIPTION_INPUT).clear({ force: true }).type(rule.description, { force: true });
  if (rule.severity) {
    fillSeverity(rule.severity);
  }
  if (rule.risk_score) {
    fillRiskScore(rule.risk_score);
  }
  if (rule.tags) {
    fillRuleTags(rule.tags);
  }
  cy.get(ADVANCED_SETTINGS_BTN).click({ force: true });

  if (rule.references) {
    fillReferenceUrls(rule.references);
  }

  if (rule.false_positives) {
    fillFalsePositiveExamples(rule.false_positives);
  }

  if (rule.threat) {
    fillMitre(rule.threat);
  }
  if (rule.note) {
    fillNote(rule.note);
  }
};

export const expandAdvancedSettings = () => {
  cy.get(ADVANCED_SETTINGS_BTN).click({ force: true });
};

export const fillNote = (note: string = ruleFields.investigationGuide) => {
  cy.get(INVESTIGATION_NOTES_TEXTAREA).clear({ force: true }).type(note, { force: true });
  return note;
};

export const fillMitre = (mitreAttacks: Threat[]) => {
  let techniqueIndex = 0;
  let subtechniqueInputIndex = 0;
  mitreAttacks.forEach((mitre, tacticIndex) => {
    cy.get(MITRE_ATTACK_TACTIC_DROPDOWN).eq(tacticIndex).click({ force: true });
    cy.contains(MITRE_TACTIC, `${mitre.tactic.name} (${mitre.tactic.id})`).click();

    if (mitre.technique) {
      mitre.technique.forEach((technique) => {
        cy.get(MITRE_ATTACK_ADD_TECHNIQUE_BUTTON).eq(tacticIndex).click({ force: true });
        cy.get(MITRE_ATTACK_TECHNIQUE_DROPDOWN).eq(techniqueIndex).click({ force: true });
        cy.contains(MITRE_TACTIC, `${technique.name} (${technique.id})`).click();
        if (technique.subtechnique) {
          technique.subtechnique.forEach((subtechnique) => {
            cy.get(MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON).eq(techniqueIndex).click({ force: true });
            cy.get(MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN)
              .eq(subtechniqueInputIndex)
              .click({ force: true });
            cy.contains(MITRE_TACTIC, `${subtechnique.name} (${subtechnique.id})`).click();
            subtechniqueInputIndex++;
          });
          techniqueIndex++;
        }
      });
    }

    cy.get(MITRE_ATTACK_ADD_TACTIC_BUTTON).click({ force: true });
  });
  return mitreAttacks;
};

export const fillThreat = (threat: Threat = ruleFields.threat) => {
  cy.get(MITRE_ATTACK_TACTIC_DROPDOWN).first().click({ force: true });
  cy.contains(MITRE_TACTIC, threat.tactic.name).click();
  return threat;
};

export const fillThreatTechnique = (technique: ThreatTechnique = ruleFields.threatTechnique) => {
  cy.get(MITRE_ATTACK_ADD_TECHNIQUE_BUTTON).first().click({ force: true });
  cy.get(MITRE_ATTACK_TECHNIQUE_DROPDOWN).first().click({ force: true });
  cy.contains(MITRE_TACTIC, technique.name).click();
  return technique;
};

export const fillThreatSubtechnique = (
  subtechnique: ThreatSubtechnique = ruleFields.threatSubtechnique
) => {
  cy.get(MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON).first().click({ force: true });
  cy.get(MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN).first().click({ force: true });
  cy.contains(MITRE_TACTIC, subtechnique.name).click();
  return subtechnique;
};

export const fillFalsePositiveExamples = (falsePositives: string[] = ruleFields.falsePositives) => {
  falsePositives.forEach((falsePositive, index) => {
    cy.get(FALSE_POSITIVES_INPUT)
      .eq(index)
      .clear({ force: true })
      .type(falsePositive, { force: true });
    cy.get(ADD_FALSE_POSITIVE_BTN).click({ force: true });
  });
  return falsePositives;
};

export const importSavedQuery = (timelineId: string) => {
  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(timelineId)).click();
  cy.get(CUSTOM_QUERY_INPUT).should('not.be.empty');
  removeAlertsIndex();
};

export const fillRuleName = (ruleName: string = ruleFields.ruleName) => {
  cy.get(RULE_NAME_INPUT).clear({ force: true }).type(ruleName, { force: true });
  return ruleName;
};

export const fillDescription = (description: string = ruleFields.ruleDescription) => {
  cy.get(RULE_DESCRIPTION_INPUT).clear({ force: true }).type(description, { force: true });
  return description;
};

export const fillSeverity = (severity: string = ruleFields.ruleSeverity) => {
  cy.get(SEVERITY_DROPDOWN).click({ force: true });
  cy.get(`#${severity.toLowerCase()}`).click();
  return severity;
};

export const fillRiskScore = (riskScore: number = ruleFields.riskScore) => {
  cy.get(DEFAULT_RISK_SCORE_INPUT).type(`{selectall}${riskScore}`, { force: true });
  return riskScore;
};

export const fillRuleTags = (tags: string[] = ruleFields.ruleTags) => {
  tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });
  return tags;
};

export const fillReferenceUrls = (referenceUrls: string[] = ruleFields.referenceUrls) => {
  referenceUrls.forEach((url, index) => {
    cy.get(REFERENCE_URLS_INPUT).eq(index).clear({ force: true }).type(url, { force: true });
    cy.get(ADD_REFERENCE_URL_BTN).click({ force: true });
  });
  return referenceUrls;
};

export const fillAboutRuleAndContinue = (rule: RuleCreateProps) => {
  fillAboutRule(rule);
  getAboutContinueButton().should('exist').click({ force: true });
};

export const fillAboutRuleWithOverrideAndContinue = (rule: RuleCreateProps) => {
  cy.get(RULE_NAME_INPUT).type(rule.name, { force: true });
  cy.get(RULE_DESCRIPTION_INPUT).type(rule.description, { force: true });

  cy.get(SEVERITY_MAPPING_OVERRIDE_OPTION).click();
  if (rule.severity_mapping) {
    rule.severity_mapping.forEach((severity, i) => {
      cy.get(SEVERITY_OVERRIDE_ROW)
        .eq(i)
        .within(() => {
          cy.get(COMBO_BOX_INPUT).eq(0).type(`${severity.field}{enter}`);
          cy.get(COMBO_BOX_INPUT).eq(1).type(`${severity.value}{enter}`);
        });
    });
  }

  if (rule.severity) {
    fillSeverity(rule.severity);
  }

  cy.get(RISK_MAPPING_OVERRIDE_OPTION).click();
  if (rule.risk_score_mapping) {
    const field = rule.risk_score_mapping[0].field;
    cy.get(RISK_OVERRIDE).within(() => {
      cy.get(COMBO_BOX_INPUT).type(`${field}{enter}`);
    });
  }

  cy.get(DEFAULT_RISK_SCORE_INPUT).type(`{selectall}${rule.risk_score}`, { force: true });

  if (rule.tags) {
    fillRuleTags(rule.tags);
  }

  cy.get(ADVANCED_SETTINGS_BTN).click({ force: true });

  if (rule.references) {
    fillReferenceUrls(rule.references);
  }
  if (rule.false_positives) {
    fillFalsePositiveExamples(rule.false_positives);
  }
  if (rule.threat) {
    fillMitre(rule.threat);
  }
  if (rule.note) {
    fillNote(rule.note);
  }

  cy.get(RULE_NAME_OVERRIDE).within(() => {
    cy.get(COMBO_BOX_INPUT).type(`${rule.rule_name_override}{enter}`);
  });

  cy.get(RULE_TIMESTAMP_OVERRIDE).within(() => {
    cy.get(COMBO_BOX_INPUT).type(`${rule.timestamp_override}{enter}`);
  });

  getAboutContinueButton().should('exist').click({ force: true });
};

// called after import rule from saved timeline
// if alerts index is created, it is included in the timeline
// to be consistent in multiple test runs, remove it if it's there
export const removeAlertsIndex = () => {
  cy.get(RULE_INDICES).then(($body) => {
    if ($body.find(ALERTS_INDEX_BUTTON).length > 0) {
      cy.get(ALERTS_INDEX_BUTTON).click();
    }
  });
};

export const continueWithNextSection = () => {
  cy.get(CONTINUE_BUTTON).should('exist').click();
};

export const fillDefineCustomRuleAndContinue = (rule: QueryRuleCreateProps) => {
  if (rule.data_view_id !== undefined) {
    cy.get(DATA_VIEW_OPTION).click();
    cy.get(DATA_VIEW_COMBO_BOX).type(`${rule.data_view_id}{enter}`);
  }
  cy.get(CUSTOM_QUERY_INPUT)
    .first()
    .type(rule.query || '');
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillScheduleRuleAndContinue = (rule: RuleCreateProps) => {
  if (rule.interval) {
    const intervalNumber = rule.interval.slice(0, rule.interval.length - 1);
    const intervalType = rule.interval.charAt(rule.interval.length - 1);
    cy.get(RUNS_EVERY_INTERVAL).type('{selectall}').type(intervalNumber);
    cy.get(RUNS_EVERY_TIME_TYPE).select(intervalType);
  }
  if (rule.from) {
    const additionalLookback = getHumanizedDuration(rule.from, rule.interval ?? '5m');
    const additionalLookbackNumber = additionalLookback.slice(0, additionalLookback.length - 1);
    const additionalLookbackType = additionalLookback.charAt(additionalLookback.length - 1);
    cy.get(LOOK_BACK_INTERVAL).type('{selectAll}').type(additionalLookbackNumber);
    cy.get(LOOK_BACK_TIME_TYPE).select(additionalLookbackType);
  }
  cy.get(SCHEDULE_CONTINUE_BUTTON).click({ force: true });
};

export const fillFrom = (from: RuleIntervalFrom = ruleFields.ruleIntervalFrom) => {
  const value = from.slice(0, from.length - 1);
  const type = from.slice(from.length - 1);
  cy.get(LOOK_BACK_INTERVAL).type('{selectAll}').type(value);
  cy.get(LOOK_BACK_TIME_TYPE).select(type);
};

export const fillRuleAction = (actions: Actions) => {
  cy.get(ACTIONS_THROTTLE_INPUT).select(actions.throttle);
  actions.connectors.forEach((connector) => {
    switch (connector.type) {
      case 'index':
        cy.get(INDEX_SELECTOR).click();
        cy.get(CREATE_ACTION_CONNECTOR_BTN).click();
        fillIndexConnectorForm(connector);
        break;
      case 'email':
        cy.get(EMAIL_ACTION_BTN).click();
        cy.get(CREATE_ACTION_CONNECTOR_BTN).click();
        fillEmailConnectorForm(connector);
        break;
    }
  });
};

export const fillDefineThresholdRuleAndContinue = (rule: ThresholdRuleCreateProps) => {
  const thresholdField = 0;
  const threshold = 1;

  const typeThresholdField = ($el: Cypress.ObjectLike) =>
    cy
      .wrap($el)
      .type(isArray(rule.threshold.field) ? rule.threshold.field[0] : rule.threshold.field, {
        delay: 35,
      });

  cy.get(CUSTOM_QUERY_INPUT)
    .first()
    .type(rule.query || '');
  cy.get(THRESHOLD_INPUT_AREA)
    .find(INPUT)
    .then((inputs) => {
      cy.wrap(inputs[thresholdField]).click();
      cy.wrap(inputs[thresholdField]).pipe(typeThresholdField);
      cy.get(EUI_FILTER_SELECT_ITEM).click({ force: true });
      cy.wrap(inputs[threshold]).clear().type(`${rule.threshold.value}`);
    });
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineEqlRuleAndContinue = (rule: EqlRuleCreateProps) => {
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('exist');
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('be.visible');
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).type(rule.query);
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_VALIDATION_SPINNER).should('not.exist');
  cy.get(RULES_CREATION_PREVIEW_BUTTON).should('not.be.disabled').click({ force: true });
  cy.get(RULES_CREATION_PREVIEW_REFRESH_BUTTON).should('not.be.disabled').click({ force: true });
  cy.get(PREVIEW_HISTOGRAM)
    .invoke('text')
    .then((text) => {
      if (text !== 'Rule Preview') {
        cy.get(RULES_CREATION_PREVIEW_REFRESH_BUTTON).click({ force: true });
        cy.get(PREVIEW_HISTOGRAM).should('contain.text', 'Rule Preview');
      }
    });
  cy.get(TOAST_ERROR).should('not.exist');

  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
  cy.get(`${RULES_CREATION_FORM} ${EQL_QUERY_INPUT}`).should('not.exist');
};

export const fillDefineNewTermsRuleAndContinue = (rule: NewTermsRuleCreateProps) => {
  cy.get(CUSTOM_QUERY_INPUT)
    .first()
    .type(rule.query || '');
  cy.get(NEW_TERMS_INPUT_AREA).find(INPUT).click().type(rule.new_terms_fields[0], { delay: 35 });
  cy.get(EUI_FILTER_SELECT_ITEM).click({ force: true });
  cy.focused().type('{esc}'); // Close combobox dropdown so next inputs can be interacted with
  const historySize = convertHistoryStartToSize(rule.history_window_start);
  const historySizeNumber = historySize.slice(0, historySize.length - 1);
  const historySizeType = historySize.charAt(historySize.length - 1);
  cy.get(NEW_TERMS_INPUT_AREA)
    .find(NEW_TERMS_HISTORY_SIZE)
    .type('{selectAll}')
    .type(historySizeNumber);
  cy.get(NEW_TERMS_INPUT_AREA).find(NEW_TERMS_HISTORY_TIME_TYPE).select(historySizeType);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

/**
 * Fills in the indicator match rows for tests by giving it an optional rowNumber,
 * a indexField, a indicatorIndexField, and an optional validRows which indicates
 * which row is valid or not.
 *
 * There are special tricks below with Eui combo box:
 * cy.get(`button[title="${indexField}"]`)
 * .should('be.visible')
 * .then(([e]) => e.click());
 *
 * To first ensure the button is there before clicking on the button. There are
 * race conditions where if the Eui drop down button from the combo box is not
 * visible then the click handler is not there either, and when we click on it
 * that will cause the item to _not_ be selected. Using a {enter} with the combo
 * box also does not select things from EuiCombo boxes either, so I have to click
 * the actual contents of the EuiCombo box to select things.
 */
export const fillIndicatorMatchRow = ({
  rowNumber,
  indexField,
  indicatorIndexField,
  validColumns,
}: {
  rowNumber?: number; // default is 1
  indexField: string;
  indicatorIndexField: string;
  validColumns?: 'indexField' | 'indicatorField' | 'both' | 'none'; // default is both are valid entries
}) => {
  const computedRowNumber = rowNumber == null ? 1 : rowNumber;
  const computedValueRows = validColumns == null ? 'both' : validColumns;
  cy.get(THREAT_MAPPING_COMBO_BOX_INPUT)
    .eq(computedRowNumber * 2 - 2)
    .eq(0)
    .type(indexField);
  if (computedValueRows === 'indexField' || computedValueRows === 'both') {
    cy.get(`button[title="${indexField}"]`).then(([e]) => e.click());
  }
  cy.get(THREAT_MAPPING_COMBO_BOX_INPUT)
    .eq(computedRowNumber * 2 - 1)
    .type(indicatorIndexField);

  if (computedValueRows === 'indicatorField' || computedValueRows === 'both') {
    cy.get(`button[title="${indicatorIndexField}"]`).then(([e]) => e.click());
  }
};

/**
 * Fills in both the index pattern and the indicator match index pattern.
 * @param indexPattern  The index pattern.
 * @param indicatorIndex The indicator index pattern.
 */
export const fillIndexAndIndicatorIndexPattern = (
  indexPattern?: string[],
  indicatorIndex?: string[]
) => {
  getIndexPatternClearButton().click();

  getIndicatorIndex().type(`${indexPattern}{enter}`);
  getIndicatorIndicatorIndex().type(`{backspace}{enter}${indicatorIndex}{enter}`);
};

/** Returns the indicator index drop down field. Pass in row number, default is 1 */
export const getIndicatorIndexComboField = (row = 1) =>
  cy.get(THREAT_COMBO_BOX_INPUT).eq(row * 2 - 2);

/** Returns the indicator mapping drop down field. Pass in row number, default is 1 */
export const getIndicatorMappingComboField = (row = 1) =>
  cy.get(THREAT_COMBO_BOX_INPUT).eq(row * 2 - 1);

/** Returns the indicator matches DELETE button for the mapping. Pass in row number, default is 1  */
export const getIndicatorDeleteButton = (row = 1) =>
  cy.get(THREAT_ITEM_ENTRY_DELETE_BUTTON).eq(row - 1);

/** Returns the indicator matches AND button for the mapping */
export const getIndicatorAndButton = () => cy.get(THREAT_MATCH_AND_BUTTON);

/** Returns the indicator matches OR button for the mapping */
export const getIndicatorOrButton = () => cy.get(THREAT_MATCH_OR_BUTTON);

/** Returns the invalid match content. */
export const getIndicatorInvalidationText = () => cy.contains(INVALID_MATCH_CONTENT);

/** Returns that at least one valid match is required content */
export const getIndicatorAtLeastOneInvalidationText = () => cy.contains(AT_LEAST_ONE_VALID_MATCH);

/** Returns that at least one index pattern is required content */
export const getIndexPatternInvalidationText = () => cy.contains(AT_LEAST_ONE_INDEX_PATTERN);

/** Returns the continue button on the step of about */
const getAboutContinueButton = () => cy.get(ABOUT_CONTINUE_BTN);

/** Returns the continue button on the step of define */
export const getDefineContinueButton = () => cy.get(DEFINE_CONTINUE_BUTTON);

/** Returns the indicator index pattern */
export const getIndicatorIndex = () => {
  return cy.get(THREAT_MATCH_INDICATOR_INDEX).eq(0);
};

/** Returns the indicator's indicator index */
export const getIndicatorIndicatorIndex = () =>
  cy.get(THREAT_MATCH_INDICATOR_INDICATOR_INDEX).eq(0);

/** Returns the index pattern's clear button  */
export const getIndexPatternClearButton = () => cy.get(COMBO_BOX_CLEAR_BTN).first();

/** Returns the custom query input */
export const getCustomQueryInput = () => cy.get(THREAT_MATCH_CUSTOM_QUERY_INPUT).eq(0);

/** Returns the custom query input */
export const getCustomIndicatorQueryInput = () => cy.get(THREAT_MATCH_QUERY_INPUT).eq(0);

/** Returns custom query required content */
export const getCustomQueryInvalidationText = () => cy.contains(CUSTOM_QUERY_REQUIRED);

/**
 * Fills in the define indicator match rules and then presses the continue button
 * @param rule The rule to use to fill in everything
 */
export const fillDefineIndicatorMatchRuleAndContinue = (rule: ThreatMatchRuleCreateProps) => {
  if (rule.index) {
    fillIndexAndIndicatorIndexPattern(rule.index, rule.threat_index);
  }
  fillIndicatorMatchRow({
    indexField: rule.threat_mapping[0].entries[0].field,
    indicatorIndexField: rule.threat_mapping[0].entries[0].value,
  });
  getCustomIndicatorQueryInput().type('{selectall}{enter}*:*');
  getDefineContinueButton().should('exist').click({ force: true });
  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineMachineLearningRuleAndContinue = (rule: MachineLearningRuleCreateProps) => {
  const jobsAsArray = isArray(rule.machine_learning_job_id)
    ? rule.machine_learning_job_id
    : [rule.machine_learning_job_id];
  const text = jobsAsArray
    .map((machineLearningJob) => `${machineLearningJob}{downArrow}{enter}`)
    .join('');
  cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).click({ force: true });
  cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).type(text);

  cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).type('{esc}');

  cy.get(ANOMALY_THRESHOLD_INPUT).type(`{selectall}${rule.anomaly_threshold}`, {
    force: true,
  });
  getDefineContinueButton().should('exist').click({ force: true });
};

export const goToAboutStepTab = () => {
  cy.get(ABOUT_EDIT_TAB).click({ force: true });
};

export const goToScheduleStepTab = () => {
  cy.get(SCHEDULE_EDIT_TAB).click({ force: true });
};

export const goToActionsStepTab = () => {
  cy.get(ACTIONS_EDIT_TAB).click({ force: true });
};

export const selectEqlRuleType = () => {
  cy.get(EQL_TYPE).click({ force: true });
};

export const selectIndicatorMatchType = () => {
  cy.get(INDICATOR_MATCH_TYPE).click({ force: true });
};

export const selectMachineLearningRuleType = () => {
  cy.get(MACHINE_LEARNING_TYPE).contains('Select');
  cy.get(MACHINE_LEARNING_TYPE).click({ force: true });
};

export const selectThresholdRuleType = () => {
  cy.get(THRESHOLD_TYPE).click({ force: true });
};

export const selectNewTermsRuleType = () => {
  cy.get(NEW_TERMS_TYPE).click({ force: true });
};

export const waitForAlertsToPopulate = async (alertCountThreshold = 1) => {
  cy.waitUntil(
    () => {
      refreshPage();
      return cy
        .get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((countText) => {
          const alertCount = parseInt(countText, 10) || 0;
          return alertCount >= alertCountThreshold;
        });
    },
    { interval: 500, timeout: 12000 }
  );
};

export const waitForTheRuleToBeExecuted = () => {
  cy.waitUntil(() => {
    cy.get(REFRESH_BUTTON).click({ force: true });
    return cy
      .get(RULE_STATUS)
      .invoke('text')
      .then((ruleStatus) => ruleStatus === 'succeeded');
  });
};

export const selectAndLoadSavedQuery = (queryName: string, queryValue: string) => {
  cy.get(QUERY_BAR).find(SHOW_QUERY_BAR_BUTTON).click();

  cy.get(LOAD_SAVED_QUERIES_LIST_BUTTON).click();
  cy.get(savedQueryByName(queryName)).click();
  cy.get(APPLY_SELECTED_SAVED_QUERY_BUTTON).click();

  cy.get(CUSTOM_QUERY_INPUT).should('have.value', queryValue);
};

export const checkLoadQueryDynamically = () => {
  cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).click({ force: true }).should('be.checked');
};

export const uncheckLoadQueryDynamically = () => {
  cy.get(LOAD_QUERY_DYNAMICALLY_CHECKBOX).click({ force: true }).should('not.be.checked');
};
