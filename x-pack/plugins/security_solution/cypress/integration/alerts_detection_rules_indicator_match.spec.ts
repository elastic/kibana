/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatMitreAttackDescription } from '../helpers/rules';
import { newThreatIndicatorRule } from '../objects/rule';

import {
  ALERT_RULE_METHOD,
  ALERT_RULE_NAME,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_VERSION,
  NUMBER_OF_ALERTS,
} from '../screens/alerts';
import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  RULE_SWITCH,
  SEVERITY,
} from '../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  getDetails,
  INDEX_PATTERNS_DETAILS,
  INDICATOR_INDEX_PATTERNS,
  INDICATOR_INDEX_QUERY,
  INDICATOR_MAPPING,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  removeExternalLinkText,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
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
import { removeSignalsIndex } from '../tasks/api_calls/rules';
import { cleanKibana } from '../tasks/common';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineIndicatorMatchRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectIndicatorMatchType,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS_URL } from '../urls/navigation';

describe('Detection rules, Indicator Match', () => {
  const expectedUrls = newThreatIndicatorRule.referenceUrls.join('');
  const expectedFalsePositives = newThreatIndicatorRule.falsePositivesExamples.join('');
  const expectedTags = newThreatIndicatorRule.tags.join('');
  const expectedMitre = formatMitreAttackDescription(newThreatIndicatorRule.mitre);
  const expectedNumberOfRules = 1;
  const expectedNumberOfAlerts = 1;

  beforeEach(() => {
    cleanKibana();
    removeSignalsIndex();
    esArchiverLoad('threat_indicator');
    esArchiverLoad('threat_data');
  });

  afterEach(() => {
    esArchiverUnload('threat_indicator');
    esArchiverUnload('threat_data');
  });

  it('Creates and activates a new Indicator Match rule', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    selectIndicatorMatchType();
    fillDefineIndicatorMatchRuleAndContinue(newThreatIndicatorRule);
    fillAboutRuleAndContinue(newThreatIndicatorRule);
    fillScheduleRuleAndContinue(newThreatIndicatorRule);
    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME).should('have.text', newThreatIndicatorRule.name);
    cy.get(RISK_SCORE).should('have.text', newThreatIndicatorRule.riskScore);
    cy.get(SEVERITY).should('have.text', newThreatIndicatorRule.severity);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('have.text', `${newThreatIndicatorRule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', newThreatIndicatorRule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', newThreatIndicatorRule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', newThreatIndicatorRule.riskScore);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
    });
    cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);

    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should(
        'have.text',
        newThreatIndicatorRule.index!.join('')
      );
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', '*:*');
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Indicator Match');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      getDetails(INDICATOR_INDEX_PATTERNS).should(
        'have.text',
        newThreatIndicatorRule.indicatorIndexPattern.join('')
      );
      getDetails(INDICATOR_MAPPING).should(
        'have.text',
        `${newThreatIndicatorRule.indicatorMapping} MATCHES ${newThreatIndicatorRule.indicatorIndexField}`
      );
      getDetails(INDICATOR_INDEX_QUERY).should('have.text', '*:*');
    });

    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should(
        'have.text',
        `${newThreatIndicatorRule.runsEvery.interval}${newThreatIndicatorRule.runsEvery.type}`
      );
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
        'have.text',
        `${newThreatIndicatorRule.lookBack.interval}${newThreatIndicatorRule.lookBack.type}`
      );
    });

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS).should('have.text', expectedNumberOfAlerts);
    cy.get(ALERT_RULE_NAME).first().should('have.text', newThreatIndicatorRule.name);
    cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
    cy.get(ALERT_RULE_METHOD).first().should('have.text', 'threat_match');
    cy.get(ALERT_RULE_SEVERITY)
      .first()
      .should('have.text', newThreatIndicatorRule.severity.toLowerCase());
    cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', newThreatIndicatorRule.riskScore);
  });
});
