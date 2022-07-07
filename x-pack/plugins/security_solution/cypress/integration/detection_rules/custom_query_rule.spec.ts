/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import {
  getNewRule,
  getExistingRule,
  getIndexPatterns,
  getEditedRule,
  getNewOverrideRule,
} from '../../objects/rule';
import { ALERT_GRID_CELL, NUMBER_OF_ALERTS } from '../../screens/alerts';

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
  EMAIL_ACTION_BTN,
  CREATE_ACTION_CONNECTOR_BTN,
  SAVE_ACTION_CONNECTOR_BTN,
  FROM_VALIDATION_ERROR,
  EMAIL_ACTION_TO_INPUT,
  EMAIL_ACTION_SUBJECT_INPUT,
} from '../../screens/create_new_rule';
import {
  ADDITIONAL_LOOK_BACK_DETAILS,
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
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
  deleteFirstRule,
  deleteRuleFromDetailsPage,
  deleteSelectedRules,
  editFirstRule,
  goToRuleDetails,
  selectNumberOfRules,
  waitForRulesTableToBeRefreshed,
} from '../../tasks/alerts_detection_rules';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleWithImportedQueryAndContinue,
  fillEmailConnectorForm,
  fillScheduleRuleAndContinue,
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { saveEditedRule } from '../../tasks/edit_rule';
import { login, visit } from '../../tasks/login';
import { enablesRule, getDetails } from '../../tasks/rule_details';

import { RULE_CREATION, DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Custom query rules', () => {
  before(() => {
    cleanKibana();
    login();
  });
  describe('Custom detection rules creation', () => {
    const expectedUrls = getNewRule().referenceUrls.join('');
    const expectedFalsePositives = getNewRule().falsePositivesExamples.join('');
    const expectedTags = getNewRule().tags.join('');
    const expectedMitre = formatMitreAttackDescription(getNewRule().mitre);
    const expectedNumberOfRules = 1;

    beforeEach(() => {
      deleteAlertsAndRules();
      createTimeline(getNewRule().timeline).then((response) => {
        cy.wrap({
          ...getNewRule(),
          timeline: {
            ...getNewRule().timeline,
            id: response.body.data.persistTimeline.timeline.savedObjectId,
          },
        }).as('rule');
      });
    });

    it('Creates and enables a new rule', function () {
      visit(RULE_CREATION);
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

      createAndEnableRule();

      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      cy.get(RULES_TABLE).find(RULES_ROW).should('have.length', expectedNumberOfRules);
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
        getDetails(INDEX_PATTERNS_DETAILS).should('have.text', getIndexPatterns().join(''));
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', this.rule.customQuery);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS).should(
          'have.text',
          `${getNewRule().runsEvery.interval}${getNewRule().runsEvery.type}`
        );
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
          'have.text',
          `${getNewRule().lookBack.interval}${getNewRule().lookBack.type}`
        );
      });

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .should('match', /^[1-9].+$/); // Any number of alerts
      cy.get(ALERT_GRID_CELL).contains(this.rule.name);
    });
  });

  describe('Custom detection rules deletion and edition', () => {
    context('Deletion', () => {
      beforeEach(() => {
        deleteAlertsAndRules();
        createCustomRuleEnabled(getNewRule(), 'rule1');
        createCustomRuleEnabled(getNewOverrideRule(), 'rule2');
        createCustomRuleEnabled(getExistingRule(), 'rule3');
        visit(DETECTIONS_RULE_MANAGEMENT_URL);
      });

      it('Deletes one rule', () => {
        cy.get(RULES_TABLE)
          .find(RULES_ROW)
          .then((rules) => {
            const initialNumberOfRules = rules.length;
            const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

            cy.get(SHOWING_RULES_TEXT).should('have.text', `Showing ${initialNumberOfRules} rules`);

            deleteFirstRule();
            waitForRulesTableToBeRefreshed();

            cy.get(RULES_TABLE)
              .find(RULES_ROW)
              .should('have.length', expectedNumberOfRulesAfterDeletion);
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
            waitForRulesTableToBeRefreshed();

            cy.get(RULES_TABLE)
              .find(RULES_ROW)
              .should('have.length', expectedNumberOfRulesAfterDeletion);
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

      it('Deletes one rule from detail page', () => {
        cy.get(RULES_TABLE)
          .find(RULES_ROW)
          .then((rules) => {
            const initialNumberOfRules = rules.length;
            const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

            goToRuleDetails();
            cy.intercept('POST', '/api/detection_engine/rules/_bulk_delete').as('deleteRule');

            deleteRuleFromDetailsPage();

            cy.waitFor('@deleteRule').then(() => {
              cy.get(RULES_TABLE).should('exist');
              cy.get(RULES_TABLE)
                .find(RULES_ROW)
                .should('have.length', expectedNumberOfRulesAfterDeletion);
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
      });
    });

    context('Edition', () => {
      const expectedEditedtags = getEditedRule().tags.join('');
      const expectedEditedIndexPatterns =
        getEditedRule().index && getEditedRule().index.length
          ? getEditedRule().index
          : getIndexPatterns();

      before(() => {
        deleteAlertsAndRules();
        createCustomRuleEnabled(getExistingRule(), 'rule1');
      });
      beforeEach(() => {
        visit(DETECTIONS_RULE_MANAGEMENT_URL);
      });

      it('Only modifies rule active status on enable/disable', () => {
        enablesRule();

        cy.intercept('GET', `/api/detection_engine/rules?id=*`).as('fetchRuleDetails');

        goToRuleDetails();

        cy.wait('@fetchRuleDetails').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);

          cy.wrap(response?.body.max_signals).should('eql', getExistingRule().maxSignals);
          cy.wrap(response?.body.enabled).should('eql', false);
        });
      });

      it('Allows a rule to be edited', () => {
        editFirstRule();

        // expect define step to populate
        cy.get(CUSTOM_QUERY_INPUT).should('have.value', getExistingRule().customQuery);
        if (getExistingRule().index && getExistingRule().index.length > 0) {
          cy.get(DEFINE_INDEX_INPUT).should('have.text', getExistingRule().index.join(''));
        }

        goToAboutStepTab();

        // expect about step to populate
        cy.get(RULE_NAME_INPUT).invoke('val').should('eql', getExistingRule().name);
        cy.get(RULE_DESCRIPTION_INPUT).should('have.text', getExistingRule().description);
        cy.get(TAGS_FIELD).should('have.text', getExistingRule().tags.join(''));
        cy.get(SEVERITY_DROPDOWN).should('have.text', getExistingRule().severity);
        cy.get(DEFAULT_RISK_SCORE_INPUT).invoke('val').should('eql', getExistingRule().riskScore);

        goToScheduleStepTab();

        // expect schedule step to populate
        const interval = getExistingRule().interval;
        const intervalParts = interval != null && interval.match(/[0-9]+|[a-zA-Z]+/g);
        if (intervalParts) {
          const [amount, unit] = intervalParts;
          cy.get(SCHEDULE_INTERVAL_AMOUNT_INPUT).invoke('val').should('eql', amount);
          cy.get(SCHEDULE_INTERVAL_UNITS_INPUT).invoke('val').should('eql', unit);
        } else {
          throw new Error('Cannot assert scheduling info on a rule without an interval');
        }

        goToActionsStepTab();

        cy.get(ACTIONS_THROTTLE_INPUT).invoke('val').should('eql', 'no_actions');

        cy.get(ACTIONS_THROTTLE_INPUT).select('Weekly');
        cy.get(EMAIL_ACTION_BTN).click();
        cy.get(CREATE_ACTION_CONNECTOR_BTN).click();
        fillEmailConnectorForm();
        cy.get(SAVE_ACTION_CONNECTOR_BTN).click();

        cy.get(EMAIL_ACTION_TO_INPUT).type('test@example.com');
        cy.get(EMAIL_ACTION_SUBJECT_INPUT).type('Subject');

        cy.get(FROM_VALIDATION_ERROR).should('not.exist');

        goToAboutStepTab();
        cy.get(TAGS_CLEAR_BUTTON).click({ force: true });
        fillAboutRule(getEditedRule());

        cy.intercept('GET', '/api/detection_engine/rules?id*').as('getRule');

        saveEditedRule();

        cy.wait('@getRule').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);
          // ensure that editing rule does not modify max_signals
          cy.wrap(response?.body.max_signals).should('eql', getExistingRule().maxSignals);
        });

        cy.get(RULE_NAME_HEADER).should('contain', `${getEditedRule().name}`);
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', getEditedRule().description);
        cy.get(ABOUT_DETAILS).within(() => {
          getDetails(SEVERITY_DETAILS).should('have.text', getEditedRule().severity);
          getDetails(RISK_SCORE_DETAILS).should('have.text', getEditedRule().riskScore);
          getDetails(TAGS_DETAILS).should('have.text', expectedEditedtags);
        });
        cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
        cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', getEditedRule().note);
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(INDEX_PATTERNS_DETAILS).should(
            'have.text',
            expectedEditedIndexPatterns.join('')
          );
          getDetails(CUSTOM_QUERY_DETAILS).should('have.text', getEditedRule().customQuery);
          getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
          getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
        });
        if (getEditedRule().interval) {
          cy.get(SCHEDULE_DETAILS).within(() => {
            getDetails(RUNS_EVERY_DETAILS).should('have.text', getEditedRule().interval);
          });
        }
      });
    });
  });
});
