/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import { indexPatterns, newThresholdRule, ThresholdRule } from '../../objects/rule';

import {
  ALERT_RULE_METHOD,
  ALERT_RULE_NAME,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_VERSION,
  NUMBER_OF_ALERTS,
} from '../../screens/alerts';

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
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_INDEX_FORM_INPUT,
  PREVIEW_BUTTON,
  PREVIEW_TIMEFRAME_SELECT,
  PREVIEW_TOTAL_HITS,
} from '../../screens/create_new_rule';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  FALSE_POSITIVES_DETAILS,
  DEFINITION_DETAILS,
  getDetails,
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  THRESHOLD_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import {
  changeRowsPerPageTo300,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { cleanKibana } from '../../tasks/common';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineThresholdRuleAndContinue,
  fillDefineThresholdRuleQueryOnlyAndContinue,
  fillScheduleRuleAndContinue,
  getIndexPatternClearButton,
  selectThresholdRuleType,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_URL } from '../../urls/navigation';

const fillOutRemainingRuleFieldsAndCreate = (rule: ThresholdRule) => {
  fillAboutRuleAndContinue(rule);
  fillScheduleRuleAndContinue(rule);
  createAndActivateRule();
};

describe('threshold', () => {
  describe('Detection rules, Threshold', () => {
    const expectedUrls = newThresholdRule.referenceUrls.join('');
    const expectedFalsePositives = newThresholdRule.falsePositivesExamples.join('');
    const expectedTags = newThresholdRule.tags.join('');
    const expectedMitre = formatMitreAttackDescription(newThresholdRule.mitre);

    const rule = {
      ...newThresholdRule,
      index: ['basic*'],
    };

    beforeEach(() => {
      cleanKibana();
      createTimeline(newThresholdRule.timeline).then((response) => {
        rule.timeline.id = response.body.data.persistTimeline.timeline.savedObjectId;
      });
      esArchiverLoad('auditbeat_basic');
    });

    afterEach(() => {
      esArchiverUnload('auditbeat_basic');
    });

    describe('Creating new threshold rules', () => {
      beforeEach(() => {
        loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
        waitForAlertsPanelToBeLoaded();
        waitForAlertsIndexToBeCreated();
        goToManageAlertsDetectionRules();
        waitForRulesTableToBeLoaded();
        goToCreateNewRule();
        selectThresholdRuleType();
      });

      it('With query only', () => {
        getIndexPatternClearButton().click();

        cy.get(DEFINE_INDEX_FORM_INPUT).type('basic*{enter}', { force: true });

        cy.get(CUSTOM_QUERY_INPUT).eq(0).type('agent.name:{enter}', { force: true });
        cy.get(CUSTOM_QUERY_INPUT).eq(0).type('"internal-ci-7"{enter}', { force: true });

        cy.get(PREVIEW_TIMEFRAME_SELECT).select('M');
        cy.get(PREVIEW_BUTTON).click({ force: true });

        cy.get(PREVIEW_TOTAL_HITS).should('have.text', '1 hit');

        cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });

        cy.get(CUSTOM_QUERY_INPUT).should('not.exist');

        fillOutRemainingRuleFieldsAndCreate(rule);

        goToRuleDetails();
        waitForTheRuleToBeExecuted();
        waitForAlertsToPopulate();
        cy.get(NUMBER_OF_ALERTS).should(($count) => expect(+$count.text()).to.be(1));
      });

      xit('With query and single threshold field defined', () => {
        fillAboutRuleAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createAndActivateRule();
      });

      xit('With query and multiple threshold fields defined', () => {
        fillAboutRuleAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createAndActivateRule();
      });

      xit('With query, multiple threshold fields, and cardinality defined', () => {
        fillAboutRuleAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createAndActivateRule();
      });

      xit('Creates and activates a new threshold rule', () => {
        fillDefineThresholdRuleAndContinue(rule);
        fillAboutRuleAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createAndActivateRule();

        cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

        changeRowsPerPageTo300();

        const expectedNumberOfRules = 1;
        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
        });

        filterByCustomRules();

        cy.get(RULES_TABLE).then(($table) => {
          cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
        });
        cy.get(RULE_NAME).should('have.text', rule.name);
        cy.get(RISK_SCORE).should('have.text', rule.riskScore);
        cy.get(SEVERITY).should('have.text', rule.severity);
        cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

        goToRuleDetails();

        cy.get(RULE_NAME_HEADER).should('have.text', `${rule.name}`);
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
        cy.get(ABOUT_DETAILS).within(() => {
          getDetails(SEVERITY_DETAILS).should('have.text', rule.severity);
          getDetails(RISK_SCORE_DETAILS).should('have.text', rule.riskScore);
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
          getDetails(INDEX_PATTERNS_DETAILS).should('have.text', indexPatterns.join(''));
          getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.customQuery);
          getDetails(RULE_TYPE_DETAILS).should('have.text', 'Threshold');
          getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
          getDetails(THRESHOLD_DETAILS).should(
            'have.text',
            `Results aggregated by ${rule.thresholdField} >= ${rule.threshold}`
          );
        });
        cy.get(SCHEDULE_DETAILS).within(() => {
          getDetails(RUNS_EVERY_DETAILS).should(
            'have.text',
            `${rule.runsEvery.interval}${rule.runsEvery.type}`
          );
          getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
            'have.text',
            `${rule.lookBack.interval}${rule.lookBack.type}`
          );
        });

        waitForTheRuleToBeExecuted();
        waitForAlertsToPopulate();

        cy.get(NUMBER_OF_ALERTS).should(($count) => expect(+$count.text()).to.be.lt(100));
        cy.get(ALERT_RULE_NAME).first().should('have.text', rule.name);
        cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
        cy.get(ALERT_RULE_METHOD).first().should('have.text', 'threshold');
        cy.get(ALERT_RULE_SEVERITY).first().should('have.text', rule.severity.toLowerCase());
        cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', rule.riskScore);
      });
    });
  });
});
