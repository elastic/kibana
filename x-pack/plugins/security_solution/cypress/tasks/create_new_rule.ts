/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CustomRule,
  MachineLearningRule,
  machineLearningRule,
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
  COMBO_BOX_INPUT,
  CREATE_AND_ACTIVATE_BTN,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_EDIT_TAB,
  FALSE_POSITIVES_INPUT,
  IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK,
  INDICATOR_MATCH_TYPE,
  INPUT,
  INVESTIGATION_NOTES_TEXTAREA,
  LOOK_BACK_INTERVAL,
  LOOK_BACK_TIME_TYPE,
  MACHINE_LEARNING_DROPDOWN,
  MACHINE_LEARNING_LIST,
  MACHINE_LEARNING_TYPE,
  MITRE_TACTIC,
  REFERENCE_URLS_INPUT,
  REFRESH_BUTTON,
  DEFAULT_RISK_SCORE_INPUT,
  RISK_MAPPING_OVERRIDE_OPTION,
  RISK_OVERRIDE,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  RULE_NAME_OVERRIDE,
  RULE_STATUS,
  RULE_TIMESTAMP_OVERRIDE,
  RUNS_EVERY_INTERVAL,
  RUNS_EVERY_TIME_TYPE,
  SCHEDULE_CONTINUE_BUTTON,
  SCHEDULE_EDIT_TAB,
  SEVERITY_DROPDOWN,
  SEVERITY_MAPPING_OVERRIDE_OPTION,
  SEVERITY_OVERRIDE_ROW,
  TAGS_INPUT,
  THRESHOLD_FIELD_SELECTION,
  THRESHOLD_INPUT_AREA,
  THRESHOLD_TYPE,
  EQL_TYPE,
  EQL_QUERY_INPUT,
  QUERY_PREVIEW_BUTTON,
  EQL_QUERY_PREVIEW_HISTOGRAM,
  EQL_QUERY_VALIDATION_SPINNER,
  COMBO_BOX_CLEAR_BTN,
  COMBO_BOX_RESULT,
  MITRE_ATTACK_TACTIC_DROPDOWN,
  MITRE_ATTACK_TECHNIQUE_DROPDOWN,
  MITRE_ATTACK_SUBTECHNIQUE_DROPDOWN,
  MITRE_ATTACK_ADD_TACTIC_BUTTON,
  MITRE_ATTACK_ADD_SUBTECHNIQUE_BUTTON,
  MITRE_ATTACK_ADD_TECHNIQUE_BUTTON,
} from '../screens/create_new_rule';
import { TOAST_ERROR } from '../screens/shared';
import { SERVER_SIDE_EVENT_COUNT } from '../screens/timeline';
import { TIMELINE } from '../screens/timelines';
import { refreshPage } from './security_header';

export const createAndActivateRule = () => {
  cy.get(SCHEDULE_CONTINUE_BUTTON).click({ force: true });
  cy.get(CREATE_AND_ACTIVATE_BTN).click({ force: true });
  cy.get(CREATE_AND_ACTIVATE_BTN).should('not.exist');
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
  cy.get(ABOUT_CONTINUE_BTN).should('exist').click({ force: true });
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

  cy.get(ABOUT_CONTINUE_BTN).should('exist').click({ force: true });
};

export const fillDefineCustomRuleWithImportedQueryAndContinue = (
  rule: CustomRule | OverrideRule
) => {
  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(rule.timeline.id!)).click();
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

export const fillDefineThresholdRuleAndContinue = (rule: ThresholdRule) => {
  const thresholdField = 0;
  const threshold = 1;

  cy.get(IMPORT_QUERY_FROM_SAVED_TIMELINE_LINK).click();
  cy.get(TIMELINE(rule.timeline.id!)).click();
  cy.get(CUSTOM_QUERY_INPUT).should('have.value', rule.customQuery);
  cy.get(THRESHOLD_INPUT_AREA)
    .find(INPUT)
    .then((inputs) => {
      cy.wrap(inputs[thresholdField]).type(rule.thresholdField);
      cy.get(THRESHOLD_FIELD_SELECTION).click({ force: true });
      cy.wrap(inputs[threshold]).clear().type(rule.threshold);
    });
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineEqlRuleAndContinue = (rule: CustomRule) => {
  cy.get(EQL_QUERY_INPUT).should('exist');
  cy.get(EQL_QUERY_INPUT).should('be.visible');
  cy.get(EQL_QUERY_INPUT).type(rule.customQuery!);
  cy.get(EQL_QUERY_VALIDATION_SPINNER).should('not.exist');
  cy.get(QUERY_PREVIEW_BUTTON).should('not.be.disabled').click({ force: true });
  cy.get(EQL_QUERY_PREVIEW_HISTOGRAM)
    .invoke('text')
    .then((text) => {
      if (text !== 'Hits') {
        cy.get(QUERY_PREVIEW_BUTTON).click({ force: true });
        cy.get(EQL_QUERY_PREVIEW_HISTOGRAM).should('contain.text', 'Hits');
      }
    });
  cy.get(TOAST_ERROR).should('not.exist');

  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
  cy.get(EQL_QUERY_INPUT).should('not.exist');
};

export const fillDefineIndicatorMatchRuleAndContinue = (rule: ThreatIndicatorRule) => {
  const INDEX_PATTERNS = 0;
  const INDICATOR_INDEX_PATTERN = 2;
  const INDICATOR_MAPPING = 3;
  const INDICATOR_INDEX_FIELD = 4;

  cy.get(COMBO_BOX_CLEAR_BTN).click();
  cy.get(COMBO_BOX_INPUT).eq(INDEX_PATTERNS).type(`${rule.index}{enter}`);
  cy.get(COMBO_BOX_INPUT).eq(INDICATOR_INDEX_PATTERN).type(`${rule.indicatorIndexPattern}{enter}`);
  cy.get(COMBO_BOX_INPUT).eq(INDICATOR_MAPPING).type(`${rule.indicatorMapping}{enter}`);
  cy.get(COMBO_BOX_RESULT).first().click();
  cy.get(COMBO_BOX_INPUT).eq(INDICATOR_INDEX_FIELD).type(`${rule.indicatorIndexField}{enter}`);
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
  cy.get(CUSTOM_QUERY_INPUT).should('not.exist');
};

export const fillDefineMachineLearningRuleAndContinue = (rule: MachineLearningRule) => {
  cy.get(MACHINE_LEARNING_DROPDOWN).click({ force: true });
  cy.contains(MACHINE_LEARNING_LIST, rule.machineLearningJob).click();
  cy.get(ANOMALY_THRESHOLD_INPUT).type(`{selectall}${machineLearningRule.anomalyScoreThreshold}`, {
    force: true,
  });
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

  cy.get(MACHINE_LEARNING_DROPDOWN).should('not.exist');
};

export const goToDefineStepTab = () => {
  cy.get(DEFINE_EDIT_TAB).click({ force: true });
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
  cy.get(MACHINE_LEARNING_TYPE).click({ force: true });
};

export const selectThresholdRuleType = () => {
  cy.get(THRESHOLD_TYPE).click({ force: true });
};

export const waitForAlertsToPopulate = async () => {
  cy.waitUntil(
    () => {
      refreshPage();
      return cy
        .get(SERVER_SIDE_EVENT_COUNT)
        .invoke('text')
        .then((countText) => {
          const alertCount = parseInt(countText, 10) || 0;
          return alertCount > 0;
        });
    },
    { interval: 500, timeout: 12000 }
  );
};

export const waitForTheRuleToBeExecuted = () => {
  cy.waitUntil(() => {
    cy.get(REFRESH_BUTTON).click();
    return cy
      .get(RULE_STATUS)
      .invoke('text')
      .then((ruleStatus) => ruleStatus === 'succeeded');
  });
};
