/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newRule, existingRule } from '../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
  SHOWING_RULES_TEXT,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  RULE_ABOUT_DETAILS_HEADER_TOGGLE,
  RULE_NAME_HEADER,
  getDescriptionForTitle,
  ABOUT_DETAILS,
  DEFINITION_DETAILS,
  SCHEDULE_DETAILS,
} from '../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import {
  changeToThreeHundredRowsPerPage,
  deleteFirstRule,
  deleteSelectedRules,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  selectNumberOfRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
  editFirstRule,
} from '../tasks/alerts_detection_rules';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleWithImportedQueryAndContinue,
  goToAboutStepTab,
  goToScheduleStepTab,
  goToActionsStepTab,
  fillAboutRule,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';
import {
  ACTIONS_THROTTLE_INPUT,
  CUSTOM_QUERY_INPUT,
  DEFINE_INDEX_INPUT,
  RULE_NAME_INPUT,
  RULE_DESCRIPTION_INPUT,
  TAGS_FIELD,
  SEVERITY_DROPDOWN,
  RISK_INPUT,
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  DEFINE_EDIT_BUTTON,
  DEFINE_CONTINUE_BUTTON,
  ABOUT_EDIT_BUTTON,
  ABOUT_CONTINUE_BTN,
} from '../screens/create_new_rule';
import { saveEditedRule } from '../tasks/edit_rule';

describe('Detection rules, custom', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates and activates a new custom rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    fillDefineCustomRuleWithImportedQueryAndContinue(newRule);
    fillAboutRuleAndContinue(newRule);

    // expect define step to repopulate
    cy.get(DEFINE_EDIT_BUTTON).click();
    cy.get(CUSTOM_QUERY_INPUT).invoke('text').should('eq', newRule.customQuery);
    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
    cy.get(DEFINE_CONTINUE_BUTTON).should('not.exist');

    // expect about step to populate
    cy.get(ABOUT_EDIT_BUTTON).click();
    cy.get(RULE_NAME_INPUT).invoke('val').should('eq', newRule.name);
    cy.get(ABOUT_CONTINUE_BTN).should('exist').click({ force: true });
    cy.get(ABOUT_CONTINUE_BTN).should('not.exist');

    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN).invoke('text').should('eql', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    const expectedNumberOfRules = 1;
    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME).invoke('text').should('eql', newRule.name);
    cy.get(RISK_SCORE).invoke('text').should('eql', newRule.riskScore);
    cy.get(SEVERITY).invoke('text').should('eql', newRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    newRule.referenceUrls.forEach((url) => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    newRule.falsePositivesExamples.forEach((falsePositive) => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    newRule.tags.forEach((tag) => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    newRule.mitre.forEach((mitre) => {
      expectedMitre = expectedMitre + mitre.tactic;
      mitre.techniques.forEach((technique) => {
        expectedMitre = expectedMitre + technique;
      });
    });
    const expectedIndexPatterns = [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'logs-*',
      'packetbeat-*',
      'winlogbeat-*',
    ];

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${newRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', newRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDescriptionForTitle('Severity').invoke('text').should('eql', newRule.severity);
      getDescriptionForTitle('Risk score').invoke('text').should('eql', newRule.riskScore);
      getDescriptionForTitle('Reference URLs').invoke('text').should('eql', expectedUrls);
      getDescriptionForTitle('False positive examples')
        .invoke('text')
        .should('eql', expectedFalsePositives);
      getDescriptionForTitle('MITRE ATT&CK').invoke('text').should('eql', expectedMitre);
      getDescriptionForTitle('Tags').invoke('text').should('eql', expectedTags);
    });

    cy.get(RULE_ABOUT_DETAILS_HEADER_TOGGLE).eq(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).invoke('text').should('eql', INVESTIGATION_NOTES_MARKDOWN);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDescriptionForTitle('Index patterns')
        .invoke('text')
        .should('eql', expectedIndexPatterns.join(''));
      getDescriptionForTitle('Custom query')
        .invoke('text')
        .should('eql', `${newRule.customQuery} `);
      getDescriptionForTitle('Rule type').invoke('text').should('eql', 'Query');
      getDescriptionForTitle('Timeline template').invoke('text').should('eql', 'None');
    });

    cy.get(SCHEDULE_DETAILS).within(() => {
      getDescriptionForTitle('Runs every').invoke('text').should('eql', '5m');
      getDescriptionForTitle('Additional look-back time').invoke('text').should('eql', '1m');
    });
  });
});

describe('Deletes custom rules', () => {
  beforeEach(() => {
    esArchiverLoad('custom_rules');
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
  });

  after(() => {
    esArchiverUnload('custom_rules');
  });

  it('Deletes one rule', () => {
    cy.get(RULES_TABLE)
      .find(RULES_ROW)
      .then((rules) => {
        const initialNumberOfRules = rules.length;
        const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

        cy.get(SHOWING_RULES_TEXT)
          .invoke('text')
          .should('eql', `Showing ${initialNumberOfRules} rules`);

        deleteFirstRule();
        waitForRulesToBeLoaded();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterDeletion);
        });
        cy.get(SHOWING_RULES_TEXT)
          .invoke('text')
          .should('eql', `Showing ${expectedNumberOfRulesAfterDeletion} rules`);
        cy.get(CUSTOM_RULES_BTN)
          .invoke('text')
          .should('eql', `Custom rules (${expectedNumberOfRulesAfterDeletion})`);
      });
  });

  it('Deletes more than one rule', () => {
    cy.get(RULES_TABLE)
      .find(RULES_ROW)
      .then((rules) => {
        const initialNumberOfRules = rules.length;
        const numberOfRulesToBeDeleted = 3;
        const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - numberOfRulesToBeDeleted;

        selectNumberOfRules(numberOfRulesToBeDeleted);
        deleteSelectedRules();
        waitForRulesToBeLoaded();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRulesAfterDeletion);
        });
        cy.get(SHOWING_RULES_TEXT)
          .invoke('text')
          .should('eql', `Showing ${expectedNumberOfRulesAfterDeletion} rule`);
        cy.get(CUSTOM_RULES_BTN)
          .invoke('text')
          .should('eql', `Custom rules (${expectedNumberOfRulesAfterDeletion})`);
      });
  });

  it('Allows a rule to be edited', () => {
    editFirstRule();

    // expect define step to populate
    cy.get(CUSTOM_QUERY_INPUT).invoke('text').should('eq', existingRule.customQuery);
    if (existingRule.index && existingRule.index.length > 0) {
      cy.get(DEFINE_INDEX_INPUT).invoke('text').should('eq', existingRule.index.join(''));
    }

    goToAboutStepTab();

    // expect about step to populate
    cy.get(RULE_NAME_INPUT).invoke('val').should('eql', existingRule.name);
    cy.get(RULE_DESCRIPTION_INPUT).invoke('text').should('eql', existingRule.description);
    cy.get(TAGS_FIELD).invoke('text').should('eql', existingRule.tags.join(''));

    cy.get(SEVERITY_DROPDOWN).invoke('text').should('eql', existingRule.severity);
    cy.get(RISK_INPUT).invoke('val').should('eql', existingRule.riskScore);

    goToScheduleStepTab();

    // expect schedule step to populate
    const intervalParts = existingRule.interval && existingRule.interval.match(/[0-9]+|[a-zA-Z]+/g);
    if (intervalParts) {
      const [amount, unit] = intervalParts;
      cy.get(SCHEDULE_INTERVAL_AMOUNT_INPUT).invoke('val').should('eql', amount);
      cy.get(SCHEDULE_INTERVAL_UNITS_INPUT).invoke('val').should('eql', unit);
    } else {
      throw new Error('Cannot assert scheduling info on a rule without an interval');
    }

    goToActionsStepTab();

    cy.get(ACTIONS_THROTTLE_INPUT).invoke('val').should('eql', 'no_actions');

    goToAboutStepTab();

    const editedRule = {
      ...existingRule,
      severity: 'Medium',
      description: 'Edited Rule description',
    };

    fillAboutRule(editedRule);
    saveEditedRule();

    const expectedTags = editedRule.tags.join('');
    const expectedIndexPatterns =
      editedRule.index && editedRule.index.length
        ? editedRule.index
        : [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ];

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${editedRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', editedRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDescriptionForTitle('Severity').invoke('text').should('eql', editedRule.severity);
      getDescriptionForTitle('Risk score').invoke('text').should('eql', editedRule.riskScore);
      getDescriptionForTitle('Tags').invoke('text').should('eql', expectedTags);
    });

    cy.get(RULE_ABOUT_DETAILS_HEADER_TOGGLE).eq(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).invoke('text').should('eql', editedRule.note);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDescriptionForTitle('Index patterns')
        .invoke('text')
        .should('eql', expectedIndexPatterns.join(''));
      getDescriptionForTitle('Custom query')
        .invoke('text')
        .should('eql', `${editedRule.customQuery} `);
      getDescriptionForTitle('Rule type').invoke('text').should('eql', 'Query');
      getDescriptionForTitle('Timeline template').invoke('text').should('eql', 'None');
    });

    if (editedRule.interval) {
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDescriptionForTitle('Runs every').invoke('text').should('eql', editedRule.interval);
      });
    }
  });
});
