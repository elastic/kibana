/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexPatterns, newOverrideRule, severitiesOverride } from '../objects/rule';
import {
  NUMBER_OF_ALERTS,
  ALERT_RULE_NAME,
  ALERT_RULE_METHOD,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_VERSION,
} from '../screens/alerts';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULE_SWITCH,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_DETAILS,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  DETAILS_DESCRIPTION,
  DETAILS_TITLE,
  FALSE_POSITIVES_DETAILS,
  getDetails,
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RISK_SCORE_OVERRIDE_DETAILS,
  RULE_NAME_HEADER,
  RULE_NAME_OVERRIDE_DETAILS,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  TIMESTAMP_OVERRIDE_DETAILS,
} from '../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  sortRiskScore,
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
  fillScheduleRuleAndContinue,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

const expectedUrls = newOverrideRule.referenceUrls.join('');
const expectedFalsePositives = newOverrideRule.falsePositivesExamples.join('');
const expectedTags = newOverrideRule.tags.join('');
const expectedMitre = newOverrideRule.mitre
  .map(function (mitre) {
    return mitre.tactic + mitre.techniques.join('');
  })
  .join('');

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
    fillScheduleRuleAndContinue(newOverrideRule);
    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

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
    cy.get(RULE_NAME).should('have.text', newOverrideRule.name);
    cy.get(RISK_SCORE).should('have.text', newOverrideRule.riskScore);
    cy.get(SEVERITY).should('have.text', newOverrideRule.severity);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('have.text', `${newOverrideRule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', newOverrideRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', newOverrideRule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', newOverrideRule.riskScore);
      getDetails(RISK_SCORE_OVERRIDE_DETAILS).should(
        'have.text',
        `${newOverrideRule.riskOverride}signal.rule.risk_score`
      );
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', newOverrideRule.nameOverride);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
      getDetails(TIMESTAMP_OVERRIDE_DETAILS).should('have.text', newOverrideRule.timestampOverride);
      cy.contains(DETAILS_TITLE, 'Severity override')
        .invoke('index', DETAILS_TITLE) // get index relative to other titles, not all siblings
        .then((severityOverrideIndex) => {
          newOverrideRule.severityOverride.forEach((severity, i) => {
            cy.get(DETAILS_DESCRIPTION)
              .eq(severityOverrideIndex + i)
              .should(
                'have.text',
                `${severity.sourceField}:${severity.sourceValue}${severitiesOverride[i]}`
              );
          });
        });
    });
    cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', indexPatterns.join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', newOverrideRule.customQuery);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should(
        'have.text',
        `${newOverrideRule.runsEvery.interval}${newOverrideRule.runsEvery.type}`
      );
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
        'have.text',
        `${newOverrideRule.lookBack.interval}${newOverrideRule.lookBack.type}`
      );
    });

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS).invoke('text').then(parseFloat).should('be.above', 0);
    cy.get(ALERT_RULE_NAME).first().should('have.text', 'auditbeat');
    cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
    cy.get(ALERT_RULE_METHOD).first().should('have.text', 'query');
    cy.get(ALERT_RULE_SEVERITY).first().should('have.text', 'critical');

    sortRiskScore();

    cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', '80');
  });
});
