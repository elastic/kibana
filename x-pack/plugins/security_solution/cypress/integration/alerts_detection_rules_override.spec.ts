/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newOverrideRule } from '../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  RULE_ABOUT_DETAILS_HEADER_TOGGLE,
  RULE_NAME_HEADER,
  ABOUT_DETAILS,
  getDescriptionForTitle,
  DEFINITION_DETAILS,
  SCHEDULE_DETAILS,
  DETAILS_TITLE,
  DETAILS_DESCRIPTION,
} from '../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../tasks/alerts';
import {
  changeToThreeHundredRowsPerPage,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/alerts_detection_rules';
import {
  createAndActivateRule,
  fillAboutRuleWithOverrideAndContinue,
  fillDefineCustomRuleWithImportedQueryAndContinue,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, override', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates and activates a new custom rule with override option', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    fillDefineCustomRuleWithImportedQueryAndContinue(newOverrideRule);
    fillAboutRuleWithOverrideAndContinue(newOverrideRule);
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
    cy.get(RULE_NAME).invoke('text').should('eql', newOverrideRule.name);
    cy.get(RISK_SCORE).invoke('text').should('eql', newOverrideRule.riskScore);
    cy.get(SEVERITY).invoke('text').should('eql', newOverrideRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    newOverrideRule.referenceUrls.forEach((url) => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    newOverrideRule.falsePositivesExamples.forEach((falsePositive) => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    newOverrideRule.tags.forEach((tag) => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    newOverrideRule.mitre.forEach((mitre) => {
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

    cy.get(RULE_NAME_HEADER).invoke('text').should('eql', `${newOverrideRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION).invoke('text').should('eql', newOverrideRule.description);

    const expectedOverrideSeverities = ['Low', 'Medium', 'High', 'Critical'];

    cy.get(ABOUT_DETAILS).within(() => {
      getDescriptionForTitle('Severity').invoke('text').should('eql', newOverrideRule.severity);
      getDescriptionForTitle('Risk score').invoke('text').should('eql', newOverrideRule.riskScore);
      getDescriptionForTitle('Risk score override')
        .invoke('text')
        .should('eql', `${newOverrideRule.riskOverride}signal.rule.risk_score`);
      getDescriptionForTitle('Rule name override')
        .invoke('text')
        .should('eql', newOverrideRule.nameOverride);
      getDescriptionForTitle('Reference URLs').invoke('text').should('eql', expectedUrls);
      getDescriptionForTitle('False positive examples')
        .invoke('text')
        .should('eql', expectedFalsePositives);
      getDescriptionForTitle('MITRE ATT&CK').invoke('text').should('eql', expectedMitre);
      getDescriptionForTitle('Tags').invoke('text').should('eql', expectedTags);
      getDescriptionForTitle('Timestamp override')
        .invoke('text')
        .should('eql', newOverrideRule.timestampOverride);
      cy.contains(DETAILS_TITLE, 'Severity override')
        .invoke('index', DETAILS_TITLE) // get index relative to other titles, not all siblings
        .then((severityOverrideIndex) => {
          newOverrideRule.severityOverride.forEach((severity, i) => {
            cy.get(DETAILS_DESCRIPTION)
              .eq(severityOverrideIndex + i)
              .invoke('text')
              .should(
                'eql',
                `${severity.sourceField}:${severity.sourceValue}${expectedOverrideSeverities[i]}`
              );
          });
        });
    });

    cy.get(RULE_ABOUT_DETAILS_HEADER_TOGGLE).eq(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).invoke('text').should('eql', INVESTIGATION_NOTES_MARKDOWN);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDescriptionForTitle('Index patterns')
        .invoke('text')
        .should('eql', expectedIndexPatterns.join(''));
      getDescriptionForTitle('Custom query')
        .invoke('text')
        .should('eql', `${newOverrideRule.customQuery} `);
      getDescriptionForTitle('Rule type').invoke('text').should('eql', 'Query');
      getDescriptionForTitle('Timeline template').invoke('text').should('eql', 'None');
    });

    cy.get(SCHEDULE_DETAILS).within(() => {
      getDescriptionForTitle('Runs every').invoke('text').should('eql', '5m');
      getDescriptionForTitle('Additional look-back time').invoke('text').should('eql', '1m');
    });
  });
});
