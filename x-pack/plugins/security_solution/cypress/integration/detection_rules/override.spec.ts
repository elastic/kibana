/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import {
  getIndexPatterns,
  getNewOverrideRule,
  getSeveritiesOverride,
  OverrideRule,
} from '../../objects/rule';

import { NUMBER_OF_ALERTS, ALERT_GRID_CELL } from '../../screens/alerts';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULE_SWITCH,
  RULES_ROW,
  RULES_TABLE,
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

import {
  changeRowsPerPageTo100,
  filterByCustomRules,
  goToRuleDetails,
} from '../../tasks/alerts_detection_rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { cleanKibana } from '../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleWithOverrideAndContinue,
  fillDefineCustomRuleWithImportedQueryAndContinue,
  fillScheduleRuleAndContinue,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';
import { getDetails } from '../../tasks/rule_details';

import { RULE_CREATION } from '../../urls/navigation';

describe('Detection rules, override', () => {
  const expectedUrls = getNewOverrideRule().referenceUrls.join('');
  const expectedFalsePositives = getNewOverrideRule().falsePositivesExamples.join('');
  const expectedTags = getNewOverrideRule().tags.join('');
  const expectedMitre = formatMitreAttackDescription(getNewOverrideRule().mitre);

  beforeEach(() => {
    cleanKibana();
    createTimeline(getNewOverrideRule().timeline).then((response) => {
      cy.wrap({
        ...getNewOverrideRule(),
        timeline: {
          ...getNewOverrideRule().timeline,
          id: response.body.data.persistTimeline.timeline.savedObjectId,
        },
      }).as('rule');
    });
  });

  it('Creates and enables a new custom rule with override option', function () {
    loginAndWaitForPageWithoutDateRange(RULE_CREATION);
    fillDefineCustomRuleWithImportedQueryAndContinue(this.rule);
    fillAboutRuleWithOverrideAndContinue(this.rule);
    fillScheduleRuleAndContinue(this.rule);
    createAndEnableRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    changeRowsPerPageTo100();

    const expectedNumberOfRules = 1;
    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME).should('have.text', this.rule.name);
    cy.get(RISK_SCORE).should('have.text', this.rule.riskScore);
    cy.get(SEVERITY).should('have.text', this.rule.severity);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${this.rule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', this.rule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', this.rule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', this.rule.riskScore);
      getDetails(RISK_SCORE_OVERRIDE_DETAILS).should(
        'have.text',
        `${this.rule.riskOverride}kibana.alert.risk_score`
      );
      getDetails(RULE_NAME_OVERRIDE_DETAILS).should('have.text', this.rule.nameOverride);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(expectedUrls);
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
      getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
        expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
      });
      getDetails(TAGS_DETAILS).should('have.text', expectedTags);
      getDetails(TIMESTAMP_OVERRIDE_DETAILS).should('have.text', this.rule.timestampOverride);
      cy.contains(DETAILS_TITLE, 'Severity override')
        .invoke('index', DETAILS_TITLE) // get index relative to other titles, not all siblings
        .then((severityOverrideIndex) => {
          (this.rule as OverrideRule).severityOverride.forEach((severity, i) => {
            cy.get(DETAILS_DESCRIPTION)
              .eq(severityOverrideIndex + i)
              .should(
                'have.text',
                `${severity.sourceField}:${severity.sourceValue}${getSeveritiesOverride()[i]}`
              );
          });
        });
    });
    cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should('have.text', getIndexPatterns().join(''));
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', this.rule.customQuery);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should(
        'have.text',
        `${this.rule.runsEvery.interval}${this.rule.runsEvery.type}`
      );
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
        'have.text',
        `${this.rule.lookBack.interval}${this.rule.lookBack.type}`
      );
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
