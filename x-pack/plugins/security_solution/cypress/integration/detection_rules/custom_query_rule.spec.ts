/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import {
  newRule,
  existingRule,
  indexPatterns,
  editedRule,
  newOverrideRule,
} from '../../objects/rule';
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
  RULES_ROW,
  RULES_TABLE,
  RULE_SWITCH,
  SEVERITY,
  SHOWING_RULES_TEXT,
} from '../../screens/alerts_detection_rules';
import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_BUTTON,
  ACTIONS_THROTTLE_INPUT,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_EDIT_BUTTON,
  DEFINE_INDEX_INPUT,
  DEFAULT_RISK_SCORE_INPUT,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  SEVERITY_DROPDOWN,
  TAGS_CLEAR_BUTTON,
  TAGS_FIELD,
} from '../../screens/create_new_rule';
import {
  ADDITIONAL_LOOK_BACK_DETAILS,
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
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
  TIMELINE_TEMPLATE_DETAILS,
} from '../../screens/rule_details';

import {
  goToManageAlertsDetectionRules,
  waitForAlertsIndexToBeCreated,
  waitForAlertsPanelToBeLoaded,
} from '../../tasks/alerts';
import {
  changeToThreeHundredRowsPerPage,
  deleteFirstRule,
  deleteSelectedRules,
  editFirstRule,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  selectNumberOfRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { createCustomRuleActivated } from '../../tasks/api_calls/rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { cleanKibana, reload } from '../../tasks/common';
import {
  createAndActivateRule,
  fillAboutRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleWithImportedQueryAndContinue,
  fillScheduleRuleAndContinue,
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { saveEditedRule, waitForKibana } from '../../tasks/edit_rule';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_URL } from '../../urls/navigation';

describe('Custom detection rules creation', () => {
  const expectedUrls = newRule.referenceUrls.join('');
  const expectedFalsePositives = newRule.falsePositivesExamples.join('');
  const expectedTags = newRule.tags.join('');
  const expectedMitre = formatMitreAttackDescription(newRule.mitre);
  const expectedNumberOfRules = 1;

  beforeEach(() => {
    cleanKibana();
    createTimeline(newRule.timeline).then((response) => {
      cy.wrap({
        ...newRule,
        timeline: {
          ...newRule.timeline,
          id: response.body.data.persistTimeline.timeline.savedObjectId,
        },
      }).as('rule');
    });
  });

  it('Creates and activates a new rule', function () {
    loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    goToCreateNewRule();
    fillDefineCustomRuleWithImportedQueryAndContinue(this.rule);
    fillAboutRuleAndContinue(this.rule);
    fillScheduleRuleAndContinue(this.rule);

    // expect define step to repopulate
    cy.get(DEFINE_EDIT_BUTTON).click();
    cy.get(CUSTOM_QUERY_INPUT).should('have.value', this.rule.customQuery);
    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
    cy.get(DEFINE_CONTINUE_BUTTON).should('not.exist');

    // expect about step to populate
    cy.get(ABOUT_EDIT_BUTTON).click();
    cy.get(RULE_NAME_INPUT).invoke('val').should('eql', this.rule.name);
    cy.get(ABOUT_CONTINUE_BTN).should('exist').click({ force: true });
    cy.get(ABOUT_CONTINUE_BTN).should('not.exist');

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
    cy.get(RULE_NAME).should('have.text', this.rule.name);
    cy.get(RISK_SCORE).should('have.text', this.rule.riskScore);
    cy.get(SEVERITY).should('have.text', this.rule.severity);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('have.text', `${this.rule.name}`);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', this.rule.description);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS).should('have.text', this.rule.severity);
      getDetails(RISK_SCORE_DETAILS).should('have.text', this.rule.riskScore);
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
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', this.rule.customQuery);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should(
        'have.text',
        `${newRule.runsEvery.interval}${newRule.runsEvery.type}`
      );
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
        'have.text',
        `${newRule.lookBack.interval}${newRule.lookBack.type}`
      );
    });

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS).should(($count) => expect(+$count.text()).to.be.gte(1));
    cy.get(ALERT_RULE_NAME).first().should('have.text', this.rule.name);
    cy.get(ALERT_RULE_VERSION).first().should('have.text', '1');
    cy.get(ALERT_RULE_METHOD).first().should('have.text', 'query');
    cy.get(ALERT_RULE_SEVERITY).first().should('have.text', this.rule.severity.toLowerCase());
    cy.get(ALERT_RULE_RISK_SCORE).first().should('have.text', this.rule.riskScore);
  });
});

describe('Custom detection rules deletion and edition', () => {
  context('Deletion', () => {
    beforeEach(() => {
      cleanKibana();
      loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
      goToManageAlertsDetectionRules();
      waitForAlertsIndexToBeCreated();
      createCustomRuleActivated(newRule, 'rule1');
      createCustomRuleActivated(newOverrideRule, 'rule2');
      createCustomRuleActivated(existingRule, 'rule3');
      reload();
    });

    it('Deletes one rule', () => {
      cy.get(RULES_TABLE)
        .find(RULES_ROW)
        .then((rules) => {
          const initialNumberOfRules = rules.length;
          const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

          cy.get(SHOWING_RULES_TEXT).should('have.text', `Showing ${initialNumberOfRules} rules`);

          deleteFirstRule();
          waitForRulesToBeLoaded();

          cy.get(RULES_TABLE).then(($table) => {
            cy.wrap($table.find(RULES_ROW).length).should(
              'eql',
              expectedNumberOfRulesAfterDeletion
            );
          });
          cy.get(SHOWING_RULES_TEXT).should(
            'have.text',
            `Showing ${expectedNumberOfRulesAfterDeletion} rules`
          );
          cy.get(CUSTOM_RULES_BTN).should(
            'have.text',
            `Custom rules (${expectedNumberOfRulesAfterDeletion})`
          );
        });
    });

    it('Deletes more than one rule', () => {
      cy.get(RULES_TABLE)
        .find(RULES_ROW)
        .then((rules) => {
          const initialNumberOfRules = rules.length;
          const numberOfRulesToBeDeleted = 2;
          const expectedNumberOfRulesAfterDeletion =
            initialNumberOfRules - numberOfRulesToBeDeleted;

          selectNumberOfRules(numberOfRulesToBeDeleted);
          deleteSelectedRules();
          waitForRulesToBeLoaded();

          cy.get(RULES_TABLE).then(($table) => {
            cy.wrap($table.find(RULES_ROW).length).should(
              'eql',
              expectedNumberOfRulesAfterDeletion
            );
          });
          cy.get(SHOWING_RULES_TEXT).should(
            'have.text',
            `Showing ${expectedNumberOfRulesAfterDeletion} rule`
          );
          cy.get(CUSTOM_RULES_BTN).should(
            'have.text',
            `Custom rules (${expectedNumberOfRulesAfterDeletion})`
          );
        });
    });
  });

  context('Edition', () => {
    const expectedEditedtags = editedRule.tags.join('');
    const expectedEditedIndexPatterns =
      editedRule.index && editedRule.index.length ? editedRule.index : indexPatterns;

    beforeEach(() => {
      cleanKibana();
      loginAndWaitForPageWithoutDateRange(DETECTIONS_URL);
      goToManageAlertsDetectionRules();
      waitForAlertsIndexToBeCreated();
      createCustomRuleActivated(existingRule, 'rule1');
      reload();
    });

    it('Allows a rule to be edited', () => {
      editFirstRule();
      waitForKibana();

      // expect define step to populate
      cy.get(CUSTOM_QUERY_INPUT).should('have.value', existingRule.customQuery);
      if (existingRule.index && existingRule.index.length > 0) {
        cy.get(DEFINE_INDEX_INPUT).should('have.text', existingRule.index.join(''));
      }

      goToAboutStepTab();

      // expect about step to populate
      cy.get(RULE_NAME_INPUT).invoke('val').should('eql', existingRule.name);
      cy.get(RULE_DESCRIPTION_INPUT).should('have.text', existingRule.description);
      cy.get(TAGS_FIELD).should('have.text', existingRule.tags.join(''));
      cy.get(SEVERITY_DROPDOWN).should('have.text', existingRule.severity);
      cy.get(DEFAULT_RISK_SCORE_INPUT).invoke('val').should('eql', existingRule.riskScore);

      goToScheduleStepTab();

      // expect schedule step to populate
      const intervalParts =
        existingRule.interval && existingRule.interval.match(/[0-9]+|[a-zA-Z]+/g);
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
      cy.get(TAGS_CLEAR_BUTTON).click({ force: true });
      fillAboutRule(editedRule);
      saveEditedRule();

      cy.get(RULE_NAME_HEADER).should('have.text', `${editedRule.name}`);
      cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', editedRule.description);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(SEVERITY_DETAILS).should('have.text', editedRule.severity);
        getDetails(RISK_SCORE_DETAILS).should('have.text', editedRule.riskScore);
        getDetails(TAGS_DETAILS).should('have.text', expectedEditedtags);
      });
      cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
      cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', editedRule.note);
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(INDEX_PATTERNS_DETAILS).should(
          'have.text',
          expectedEditedIndexPatterns.join('')
        );
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', editedRule.customQuery);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      if (editedRule.interval) {
        cy.get(SCHEDULE_DETAILS).within(() => {
          getDetails(RUNS_EVERY_DETAILS).should('have.text', editedRule.interval);
        });
      }
    });
  });
});
