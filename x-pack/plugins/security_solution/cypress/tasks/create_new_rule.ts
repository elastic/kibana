/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEmailConnector, EmailConnector } from '../objects/connector';
import {
  CustomRule,
  MachineLearningRule,
  getMachineLearningRule,
  OverrideRule,
  ThreatIndicatorRule,
  ThresholdRule,
} from '../objects/rule';
import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_TAB,
  ACTIONS_EDIT_TAB,
  ADD_FALSE_POSITIVE_BTN,
  ADD_REFERENCE_URL_BTN,
  ADVANCED_SETTINGS_BTN,
  ANOMALY_THRESHOLD_INPUT,
  AT_LEAST_ONE_INDEX_PATTERN,
  AT_LEAST_ONE_VALID_MATCH,
  BACK_TO_ALL_RULES_LINK,
  COMBO_BOX_CLEAR_BTN,
  COMBO_BOX_INPUT,
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
  QUERY_PREVIEW_BUTTON,
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
  RULES_CREATION_PREVIEW,
  RUNS_EVERY_INTERVAL,
  RUNS_EVERY_TIME_TYPE,
  SCHEDULE_CONTINUE_BUTTON,
  SCHEDULE_EDIT_TAB,
  SEVERITY_DROPDOWN,
  SEVERITY_MAPPING_OVERRIDE_OPTION,
  SEVERITY_OVERRIDE_ROW,
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
  THRESHOLD_FIELD_SELECTION,
  THRESHOLD_INPUT_AREA,
  THRESHOLD_TYPE,
  CONNECTOR_NAME_INPUT,
  EMAIL_CONNECTOR_FROM_INPUT,
  EMAIL_CONNECTOR_HOST_INPUT,
  EMAIL_CONNECTOR_PORT_INPUT,
  EMAIL_CONNECTOR_USER_INPUT,
  EMAIL_CONNECTOR_PASSWORD_INPUT,
  EMAIL_CONNECTOR_SERVICE_SELECTOR,
  PREVIEW_HISTOGRAM,
} from '../screens/create_new_rule';
import { TOAST_ERROR } from '../screens/shared';
import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';
import { TIMELINE } from '../screens/timelines';
import { refreshPage } from './security_header';

export const createAndEnableRule = () => {
  cy.get(SCHEDULE_CONTINUE_BUTTON).click({ force: true });
  cy.get(CREATE_AND_ENABLE_BTN).click({ force: true });
  cy.get(CREATE_AND_ENABLE_BTN).should('not.exist');
  cy.get(BACK_TO_ALL_RULES_LINK).click({ force: true });
  cy.get(BACK_TO_ALL_RULES_LINK).should('not.exist');
};

export const fillAboutRule = (
  rule: CustomRule | MachineLearningRule | ThresholdRule | ThreatIndicatorRule
) => {
  cy.get(RULE_NAME_INPUT).clear({ force: true }).type(rule.name, { force: true });
  cy.get(RULE_DESCRIPTION_INPUT).clear({ force: true }).type(rule.description, { force: true });

  cy.get(SEVERITY_DROPDOWN).click({ force: true });
  cy.get(`#${rule.severity.toLowerCase()}`).click();

  cy.get(DEFAULT_RISK_SCORE_INPUT).type(`{selectall}${rule.riskScore}`, { force: true });

  rule.tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });

  cy.get(ADVANCED_SETTINGS_BTN).click({ force: true });

  rule.referenceUrls.forEach((url, index) => {
    cy.get(REFERENCE_URLS_INPUT).eq(index).clear({ force: true }).type(url, { force: true });
    cy.get(ADD_REFERENCE_URL_BTN).click({ force: true });
  });

  rule.falsePositivesExamples.forEach((falsePositive, index) => {
    cy.get(FALSE_POSITIVES_INPUT)
      .eq(index)
      .clear({ force: true })
      .type(falsePositive, { force: true });
    cy.get(ADD_FALSE_POSITIVE_BTN).click({ force: true });
  });

  let techniqueIndex = 0;
  let subtechniqueInputIndex = 0;
  rule.mitre.forEach((mitre, tacticIndex) => {
    cy.get(MITRE_ATTACK_TACTIC_DROPDOWN).eq(tacticIndex).click({ force: true });
    cy.contains(MITRE_TACTIC, mitre.tactic).click();

    mitre.techniques.forEach((technique) => {
      cy.get(MITRE_ATTACK_ADD_TECHNIQUE_BUTTON).eq(tacticIndex).click({ force: true });
      cy.get(MITRE_ATTACK_TECHNIQUE_DROPDOWN).eq(techniqueIndex).click({ force: true });
      cy.contains(MITRE_TACTIC, technique.name).click();

      technique.subtechniques.forEach((subtechnique) => {
        cy.get(MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON).eq(techniqueIndex).click({ force: true });
        cy.get(MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN)
          .eq(subtechniqueInputIndex)
          .click({ force: true });
        cy.contains(MITRE_TACTIC, subtechnique).click();
        subtechniqueInputIndex++;
      });
      techniqueIndex++;
    });

    cy.get(MITRE_ATTACK_ADD_TACTIC_BUTTON).click({ force: true });
  });

  cy.get(INVESTIGATION_NOTES_TEXTAREA).clear({ force: true }).type(rule.note, { force: true });
};

export const fillAboutRuleAndContinue = (
  rule: CustomRule | MachineLearningRule | ThresholdRule | ThreatIndicatorRule
) => {
  fillAboutRule(rule);
  getAboutContinueButton().should('exist').click({ force: true });
};

export const fillAboutRuleWithOverrideAndContinue = (rule: OverrideRule) => {
  cy.get(RULE_NAME_INPUT).type(rule.name, { force: true });
  cy.get(RULE_DESCRIPTION_INPUT).type(rule.description, { force: true });

  cy.get(SEVERITY_MAPPING_OVERRIDE_OPTION).click();
  rule.severityOverride.forEach((severity, i) => {
    cy.get(SEVERITY_OVERRIDE_ROW)
      .eq(i)
      .within(() => {
        cy.get(COMBO_BOX_INPUT).eq(0).type(`${severity.sourceField}{enter}`);
        cy.get(COMBO_BOX_INPUT).eq(1).type(`${severity.sourceValue}{enter}`);
      });
  });

  cy.get(SEVERITY_DROPDOWN).click({ force: true });
  cy.get(`#${rule.severity.toLowerCase()}`).click();

  cy.get(RISK_MAPPING_OVERRIDE_OPTION).click();
  cy.get(RISK_OVERRIDE).within(() => {
    cy.get(COMBO_BOX_INPUT).type(`${rule.riskOverride}{enter}`);
  });

  cy.get(DEFAULT_RISK_SCORE_INPUT).type(`{selectall}${rule.riskScore}`, { force: true });

  rule.tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}{enter}`, { force: true });
  });

  cy.get(ADVANCED_SETTINGS_BTN).click({ force: true });

  rule.referenceUrls.forEach((url, index) => {
    cy.get(REFERENCE_URLS_INPUT).eq(index).type(url, { force: true });
    cy.get(ADD_REFERENCE_URL_BTN).click({ force: true });
  });

  rule.falsePositivesExamples.forEach((falsePositive, index) => {
    cy.get(FALSE_POSITIVES_INPUT).eq(index).type(falsePositive, { force: true });
    cy.get(ADD_FALSE_POSITIVE_BTN).click({ force: true });
  });

  let techniqueIndex = 0;
  let subtechniqueInputIndex = 0;
  rule.mitre.forEach((mitre, tacticIndex) => {
    cy.get(MITRE_ATTACK_TACTIC_DROPDOWN).eq(tacticIndex).click({ force: true });
    cy.contains(MITRE_TACTIC, mitre.tactic).click();

    mitre.techniques.forEach((technique) => {
      cy.get(MITRE_ATTACK_ADD_TECHNIQUE_BUTTON).eq(tacticIndex).click({ force: true });
      cy.get(MITRE_ATTACK_TECHNIQUE_DROPDOWN).eq(techniqueIndex).click({ force: true });
      cy.contains(MITRE_TACTIC, technique.name).click();

      technique.subtechniques.forEach((subtechnique) => {
        cy.get(MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON).eq(techniqueIndex).click({ force: true });
        cy.get(MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN)
          .eq(subtechniqueInputIndex)
          .click({ force: true });
        cy.contains(MITRE_TACTIC, subtechnique).click();
        subtechniqueInputIndex++;
      });
      techniqueIndex++;
    });

    cy.get(MITRE_ATTACK_ADD_TACTIC_BUTTON).click({ force: true });
  });

  cy.get(INVESTIGATION_NOTES_TEXTAREA).type(rule.note, { force: true });

  cy.get(RULE_NAME_OVERRIDE).within(() => {
    cy.get(COMBO_BOX_INPUT).type(`${rule.nameOverride}{enter}`);
  });

  cy.get(RULE_TIMESTAMP_OVERRIDE).within(() => {
    cy.get(COMBO_BOX_INPUT).type(`${rule.timestampOverride}{enter}`);
  });

  getAboutContinueButton().should('exist').click({ force: true });
};

export const fillDefineCustomRuleWithImportedQueryAndContinue = (
  rule: CustomRule | OverrideRule
) => {
  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(rule.timeline.id)).click();
  cy.get(CUSTOM_QUERY_INPUT).should('have.value', rule.customQuery);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillScheduleRuleAndContinue = (rule: CustomRule | MachineLearningRule) => {
  cy.get(RUNS_EVERY_INTERVAL).type('{selectall}').type(rule.runsEvery.interval);
  cy.get(RUNS_EVERY_TIME_TYPE).select(rule.runsEvery.timeType);
  cy.get(LOOK_BACK_INTERVAL).type('{selectAll}').type(rule.lookBack.interval);
  cy.get(LOOK_BACK_TIME_TYPE).select(rule.lookBack.timeType);
};

export const fillDefineThresholdRule = (rule: ThresholdRule) => {
  const thresholdField = 0;
  const threshold = 1;

  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(rule.timeline.id)).click();
  cy.get(COMBO_BOX_CLEAR_BTN).first().click();

  rule.index.forEach((index) => {
    cy.get(COMBO_BOX_INPUT).first().type(`${index}{enter}`);
  });

  cy.get(CUSTOM_QUERY_INPUT).should('have.value', rule.customQuery);
  cy.get(THRESHOLD_INPUT_AREA)
    .find(INPUT)
    .then((inputs) => {
      cy.wrap(inputs[thresholdField]).type(rule.thresholdField);
      cy.get(THRESHOLD_FIELD_SELECTION).click({ force: true });
      cy.wrap(inputs[threshold]).clear().type(rule.threshold);
    });
};

export const fillDefineThresholdRuleAndContinue = (rule: ThresholdRule) => {
  const thresholdField = 0;
  const threshold = 1;

  const typeThresholdField = ($el: Cypress.ObjectLike) =>
    cy.wrap($el).type(rule.thresholdField, { delay: 35 });

  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(rule.timeline.id)).click();
  cy.get(CUSTOM_QUERY_INPUT).should('have.value', rule.customQuery);
  cy.get(THRESHOLD_INPUT_AREA)
    .find(INPUT)
    .then((inputs) => {
      cy.wrap(inputs[thresholdField]).click();
      cy.wrap(inputs[thresholdField]).pipe(typeThresholdField);
      cy.get(THRESHOLD_FIELD_SELECTION).click({ force: true });
      cy.wrap(inputs[threshold]).clear().type(rule.threshold);
    });
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineEqlRuleAndContinue = (rule: CustomRule) => {
  if (rule.customQuery == null) {
    throw new TypeError('The rule custom query should never be undefined or null ');
  }
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('exist');
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('be.visible');
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).type(rule.customQuery);
  cy.get(RULES_CREATION_FORM).find(EQL_QUERY_VALIDATION_SPINNER).should('not.exist');
  cy.get(RULES_CREATION_PREVIEW)
    .find(QUERY_PREVIEW_BUTTON)
    .should('not.be.disabled')
    .click({ force: true });
  cy.get(PREVIEW_HISTOGRAM)
    .invoke('text')
    .then((text) => {
      if (text !== 'Rule Preview') {
        cy.get(RULES_CREATION_PREVIEW).find(QUERY_PREVIEW_BUTTON).click({ force: true });
        cy.get(PREVIEW_HISTOGRAM).should('contain.text', 'Rule Preview');
      }
    });
  cy.get(TOAST_ERROR).should('not.exist');

  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
  cy.get(`${RULES_CREATION_FORM} ${EQL_QUERY_INPUT}`).should('not.exist');
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
    cy.get(`button[title="${indexField}"]`)
      .should('be.visible')
      .then(([e]) => e.click());
  }
  cy.get(THREAT_MAPPING_COMBO_BOX_INPUT)
    .eq(computedRowNumber * 2 - 1)
    .type(indicatorIndexField);

  if (computedValueRows === 'indicatorField' || computedValueRows === 'both') {
    cy.get(`button[title="${indicatorIndexField}"]`)
      .should('be.visible')
      .then(([e]) => e.click());
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

export const fillEmailConnectorForm = (connector: EmailConnector = getEmailConnector()) => {
  cy.get(CONNECTOR_NAME_INPUT).type(connector.name);
  cy.get(EMAIL_CONNECTOR_SERVICE_SELECTOR).select(connector.service);
  cy.get(EMAIL_CONNECTOR_FROM_INPUT).type(connector.from);
  cy.get(EMAIL_CONNECTOR_HOST_INPUT).type(connector.host);
  cy.get(EMAIL_CONNECTOR_PORT_INPUT).type(connector.port);
  cy.get(EMAIL_CONNECTOR_USER_INPUT).type(connector.user);
  cy.get(EMAIL_CONNECTOR_PASSWORD_INPUT).type(connector.password);
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
export const getAboutContinueButton = () => cy.get(ABOUT_CONTINUE_BTN);

/** Returns the continue button on the step of define */
export const getDefineContinueButton = () => cy.get(DEFINE_CONTINUE_BUTTON).should('exist');

/** Returns the indicator index pattern */
export const getIndicatorIndex = () => cy.get(THREAT_MATCH_INDICATOR_INDEX).eq(0);

/** Returns the indicator's indicator index */
export const getIndicatorIndicatorIndex = () =>
  cy.get(THREAT_MATCH_INDICATOR_INDICATOR_INDEX).eq(0);

/** Returns the index pattern's clear button  */
export const getIndexPatternClearButton = () => cy.get(COMBO_BOX_CLEAR_BTN).should('exist').first();

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
export const fillDefineIndicatorMatchRuleAndContinue = (rule: ThreatIndicatorRule) => {
  fillIndexAndIndicatorIndexPattern(rule.index, rule.indicatorIndexPattern);
  fillIndicatorMatchRow({
    indexField: rule.indicatorMappingField,
    indicatorIndexField: rule.indicatorIndexField,
  });
  getCustomIndicatorQueryInput().type('{selectall}{enter}*:*');
  getDefineContinueButton().should('exist').click({ force: true });
  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineMachineLearningRuleAndContinue = (rule: MachineLearningRule) => {
  rule.machineLearningJobs.forEach((machineLearningJob) => {
    cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).click({ force: true });
    cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).type(`${machineLearningJob}{enter}`);
    cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).type('{esc}');
  });
  cy.get(ANOMALY_THRESHOLD_INPUT).type(
    `{selectall}${getMachineLearningRule().anomalyScoreThreshold}`,
    {
      force: true,
    }
  );
  getDefineContinueButton().should('exist').click({ force: true });

  cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).should('not.exist');
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

export const previewResults = () => {
  cy.get(QUERY_PREVIEW_BUTTON).click();
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
