/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription, getHumanizedDuration } from '../../helpers/rules';
import { getIndexPatterns, getNewOverrideRule, getSeveritiesOverride } from '../../objects/rule';

import { NUMBER_OF_ALERTS, ALERT_GRID_CELL } from '../../screens/alerts';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
  RULE_SWITCH,
  SEVERITY,
} from '../../screens/alerts_detection_rules';
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
} from '../../screens/rule_details';

import { expectNumberOfRules, goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { cleanKibana } from '../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleWithOverrideAndContinue,
  fillDefineCustomRuleAndContinue,
  fillScheduleRuleAndContinue,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { getDetails } from '../../tasks/rule_details';

import { RULE_CREATION } from '../../urls/navigation';

describe('Detection rules, override', () => {
  const rule = getNewOverrideRule();
  const expectedUrls = rule.references?.join('');
  const expectedFalsePositives = rule.false_positives?.join('');
  const expectedTags = rule.tags?.join('');
  const mitreAttack = rule.threat;
  const expectedMitre = formatMitreAttackDescription(mitreAttack ?? []);

  before(() => {
    cleanKibana();
    login();
  });

  it('Creates and enables a new custom rule with override option', function () {
    visitWithoutDateRange(RULE_CREATION);
    fillDefineCustomRuleAndContinue(rule);
    fillAboutRuleWithOverrideAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createAndEnableRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);

    cy.get(RULE_NAME).should('have.text', rule.name);
    cy.get(RISK_SCORE).should('have.text', rule.risk_score);
    cy.get(SEVERITY).should('have.text', 'High');
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', 'High');
      getDetails(RISK_SCORE_DETAILS).should('have.text', rule.risk_score);
      getDetails(RISK_SCORE_OVERRIDE_DETAILS).should(
        'have.text',
        `${rule.risk_score_mapping?.[0].field}kibana.alert.risk_score`
      );
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', rule.rule_name_override);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
      getDetails(TIMESTAMP_OVERRIDE_DETAILS).should('have.text', rule.timestamp_override);
      cy.contains(DETAILS_TITLE, 'Severity override')
        .invoke('index', DETAILS_TITLE) // get index relative to other titles, not all siblings
        .then((severityOverrideIndex) => {
          rule.severity_mapping?.forEach((severity, i) => {
            cy.get(DETAILS_DESCRIPTION)
              .eq(severityOverrideIndex + i)
              .should(
                'have.text',
                `${severity.field}:${severity.value}${getSeveritiesOverride()[i]}`
              );
          });
        });
    });
    cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', getIndexPatterns().join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should('have.text', `${rule.interval}`);
      const humanizedDuration = getHumanizedDuration(rule.from ?? 'now-6m', rule.interval ?? '5m');
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', `${humanizedDuration}`);
    });

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS)
      .invoke('text')
      .should('match', /^[1-9].+$/); // Any number of alerts
    cy.get(ALERT_GRID_CELL).contains('auditbeat');
    cy.get(ALERT_GRID_CELL).contains('critical');
    cy.get(ALERT_GRID_CELL).contains('80');
  });
});
