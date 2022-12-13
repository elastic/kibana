/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleFields } from '../../data/detection_engine';
import {
  getNewRule,
  getExistingRule,
  getIndexPatterns,
  getEditedRule,
  getNewOverrideRule,
} from '../../objects/rule';
import { getTimeline } from '../../objects/timeline';
import { ALERT_GRID_CELL, NUMBER_OF_ALERTS } from '../../screens/alerts';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  RULE_SWITCH,
  SEVERITY,
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
  SCHEDULE_CONTINUE_BUTTON,
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
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  THREAT_TACTIC,
  THREAT_TECHNIQUE,
  THREAT_SUBTECHNIQUE,
} from '../../screens/rule_details';

import {
  deleteFirstRule,
  deleteRuleFromDetailsPage,
  deleteSelectedRules,
  editFirstRule,
  goToRuleDetails,
  selectNumberOfRules,
} from '../../tasks/alerts_detection_rules';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { addEmailConnectorAndRuleAction } from '../../tasks/common/rule_actions';
import {
  continueWithNextSection,
  createAndEnableRule,
  expandAdvancedSettings,
  fillAboutRule,
  fillDescription,
  fillFalsePositiveExamples,
  fillFrom,
  fillNote,
  fillReferenceUrls,
  fillRiskScore,
  fillRuleName,
  fillRuleTags,
  fillSeverity,
  fillThreat,
  fillThreatSubtechnique,
  fillThreatTechnique,
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
  importSavedQuery,
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
    const expectedNumberOfRules = 1;

    beforeEach(() => {
      deleteAlertsAndRules();
      createTimeline(getTimeline())
        .then((response) => {
          return response.body.data.persistTimeline.timeline.savedObjectId;
        })
        .as('timelineId');
    });

    it('Creates and enables a new rule', function () {
      visit(RULE_CREATION);

      cy.log('Filling define section');
      importSavedQuery(this.timelineId);
      continueWithNextSection();

      cy.log('Filling about section');
      fillRuleName();
      fillDescription();
      fillSeverity();
      fillRiskScore();
      fillRuleTags();
      expandAdvancedSettings();
      fillReferenceUrls();
      fillFalsePositiveExamples();
      fillThreat();
      fillThreatTechnique();
      fillThreatSubtechnique();
      fillNote();
      continueWithNextSection();

      cy.log('Filling schedule section');
      fillFrom();

      // expect define step to repopulate
      cy.get(DEFINE_EDIT_BUTTON).click();
      cy.get(CUSTOM_QUERY_INPUT).should('have.value', ruleFields.ruleQuery);
      cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
      cy.get(DEFINE_CONTINUE_BUTTON).should('not.exist');

      // expect about step to populate
      cy.get(ABOUT_EDIT_BUTTON).click();
      cy.get(RULE_NAME_INPUT).invoke('val').should('eql', ruleFields.ruleName);
      cy.get(ABOUT_CONTINUE_BTN).should('exist').click({ force: true });
      cy.get(ABOUT_CONTINUE_BTN).should('not.exist');
      cy.get(SCHEDULE_CONTINUE_BUTTON).click({ force: true });

      createAndEnableRule();

      cy.log('Asserting we have a new rule created');
      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      cy.log('Asserting rule view in rules list');
      cy.get(RULES_TABLE).find(RULES_ROW).should('have.length', expectedNumberOfRules);
      cy.get(RULE_NAME).should('have.text', ruleFields.ruleName);
      cy.get(RISK_SCORE).should('have.text', ruleFields.riskScore);
      cy.get(SEVERITY)
        .invoke('text')
        .then((text) => {
          cy.wrap(text.toLowerCase()).should('equal', ruleFields.ruleSeverity);
        });
      cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

      goToRuleDetails();

      cy.log('Asserting rule details');
      cy.get(RULE_NAME_HEADER).should('contain', ruleFields.ruleName);
      cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', ruleFields.ruleDescription);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(SEVERITY_DETAILS)
          .invoke('text')
          .then((text) => {
            cy.wrap(text.toLowerCase()).should('equal', ruleFields.ruleSeverity);
          });
        getDetails(RISK_SCORE_DETAILS).should('have.text', ruleFields.riskScore);
        getDetails(REFERENCE_URLS_DETAILS).should((details) => {
          expect(removeExternalLinkText(details.text())).equal(ruleFields.referenceUrls.join(''));
        });
        getDetails(FALSE_POSITIVES_DETAILS).should('have.text', ruleFields.falsePositives.join(''));
        getDetails(TAGS_DETAILS).should('have.text', ruleFields.ruleTags.join(''));
      });
      cy.get(THREAT_TACTIC).should(
        'contain',
        `${ruleFields.threat.tactic.name} (${ruleFields.threat.tactic.id})`
      );
      cy.get(THREAT_TECHNIQUE).should(
        'contain',
        `${ruleFields.threatTechnique.name} (${ruleFields.threatTechnique.id})`
      );
      cy.get(THREAT_SUBTECHNIQUE).should(
        'contain',
        `${ruleFields.threatSubtechnique.name} (${ruleFields.threatSubtechnique.id})`
      );
      cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
      cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(INDEX_PATTERNS_DETAILS).should('have.text', 'auditbeat-*');
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', ruleFields.ruleQuery);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS).should('have.text', ruleFields.ruleInterval);
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', ruleFields.ruleIntervalFrom);
      });

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.log('Asserting that alerts have been generated after the creation');
      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .should('match', /^[1-9].+$/); // Any number of alerts
      cy.get(ALERT_GRID_CELL).contains(ruleFields.ruleName);
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

            cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
              const numberOfRules = body.data.length;
              expect(numberOfRules).to.eql(initialNumberOfRules);
            });

            deleteFirstRule();

            cy.get(RULES_TABLE)
              .find(RULES_ROW)
              .should('have.length', expectedNumberOfRulesAfterDeletion);
            cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
              const numberOfRules = body.data.length;
              expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
            });
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

            cy.get(RULES_TABLE)
              .find(RULES_ROW)
              .should('have.length', expectedNumberOfRulesAfterDeletion);
            cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
              const numberOfRules = body.data.length;
              expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
            });
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

            // @ts-expect-error update types
            cy.waitFor('@deleteRule').then(() => {
              cy.get(RULES_TABLE).should('exist');
              cy.get(RULES_TABLE)
                .find(RULES_ROW)
                .should('have.length', expectedNumberOfRulesAfterDeletion);
              cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
                const numberOfRules = body.data.length;
                expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
              });
              cy.get(CUSTOM_RULES_BTN).should(
                'have.text',
                `Custom rules (${expectedNumberOfRulesAfterDeletion})`
              );
            });
          });
      });
    });

    context('Edition', () => {
      const rule = getEditedRule();
      const expectedEditedtags = rule.tags?.join('');
      const expectedEditedIndexPatterns =
        rule.dataSource.type === 'indexPatterns' &&
        rule.dataSource.index &&
        rule.dataSource.index.length
          ? rule.dataSource.index
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
        const existingRule = getExistingRule();

        editFirstRule();

        // expect define step to populate
        cy.get(CUSTOM_QUERY_INPUT).should('have.value', existingRule.customQuery);
        if (
          existingRule.dataSource.type === 'indexPatterns' &&
          existingRule.dataSource.index.length > 0
        ) {
          cy.get(DEFINE_INDEX_INPUT).should('have.text', existingRule.dataSource.index.join(''));
        }

        goToAboutStepTab();

        // expect about step to populate
        cy.get(RULE_NAME_INPUT).invoke('val').should('eql', existingRule.name);
        cy.get(RULE_DESCRIPTION_INPUT).should('have.text', existingRule.description);
        cy.get(TAGS_FIELD).should('have.text', existingRule.tags?.join(''));
        cy.get(SEVERITY_DROPDOWN).should('have.text', existingRule.severity);
        cy.get(DEFAULT_RISK_SCORE_INPUT).invoke('val').should('eql', existingRule.riskScore);

        goToScheduleStepTab();

        // expect schedule step to populate
        const interval = existingRule.interval;
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

        addEmailConnectorAndRuleAction('test@example.com', 'Subject');

        goToAboutStepTab();
        cy.get(TAGS_CLEAR_BUTTON).click({ force: true });
        fillAboutRule(getEditedRule());

        cy.intercept('GET', '/api/detection_engine/rules?id*').as('getRule');

        saveEditedRule();

        cy.wait('@getRule').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);
          // ensure that editing rule does not modify max_signals
          cy.wrap(response?.body.max_signals).should('eql', existingRule.maxSignals);
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
            expectedEditedIndexPatterns?.join('')
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
