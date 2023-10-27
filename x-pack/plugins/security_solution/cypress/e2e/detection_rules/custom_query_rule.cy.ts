/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { ruleFields } from '../../data/detection_engine';
import { getNewRule, getNewOverrideRule, getExistingRule, getEditedRule } from '../../objects/rule';
import { getTimeline } from '../../objects/timeline';
import {
  RULE_NAME,
  RISK_SCORE,
  SEVERITY,
  ALERTS_COUNT,
  ALERT_GRID_CELL,
} from '../../screens/alerts';
import { CUSTOM_RULES_BTN, RULES_MANAGEMENT_TABLE } from '../../screens/alerts_detection_rules';
import {
  ACTIONS_SUMMARY_BUTTON,
  ACTIONS_NOTIFY_WHEN_BUTTON,
} from '../../screens/common/rule_actions';
import {
  DEFINE_CONTINUE_BUTTON,
  ABOUT_CONTINUE_BTN,
  DEFINE_EDIT_BUTTON,
  CUSTOM_QUERY_INPUT,
  ABOUT_EDIT_BUTTON,
  RULE_NAME_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
  DEFINE_INDEX_INPUT,
  RULE_DESCRIPTION_INPUT,
  TAGS_FIELD,
  SEVERITY_DROPDOWN,
  DEFAULT_RISK_SCORE_INPUT,
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  TAGS_CLEAR_BUTTON,
} from '../../screens/create_new_rule';
import {
  RULE_SWITCH,
  RULE_NAME_HEADER,
  ABOUT_RULE_DESCRIPTION,
  ABOUT_DETAILS,
  SEVERITY_DETAILS,
  RISK_SCORE_DETAILS,
  REFERENCE_URLS_DETAILS,
  FALSE_POSITIVES_DETAILS,
  TAGS_DETAILS,
  THREAT_TACTIC,
  THREAT_TECHNIQUE,
  THREAT_SUBTECHNIQUE,
  INVESTIGATION_NOTES_TOGGLE,
  ABOUT_INVESTIGATION_NOTES,
  INVESTIGATION_NOTES_MARKDOWN,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  CUSTOM_QUERY_DETAILS,
  RULE_TYPE_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  SCHEDULE_DETAILS,
  RUNS_EVERY_DETAILS,
  ADDITIONAL_LOOK_BACK_DETAILS,
} from '../../screens/rule_details';
import {
  expectManagementTableRules,
  goToRuleDetails,
  getRulesManagementTableRows,
  deleteFirstRule,
  selectRulesByName,
  goToTheRuleDetailsOf,
  deleteRuleFromDetailsPage,
  editFirstRule,
} from '../../tasks/alerts_detection_rules';
import { createRule } from '../../tasks/api_calls/rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { deleteAlertsAndRules, deleteConnectors } from '../../tasks/common';
import { addEmailConnectorAndRuleAction } from '../../tasks/common/rule_actions';
import {
  importSavedQuery,
  fillRuleName,
  fillDescription,
  fillSeverity,
  fillRiskScore,
  fillRuleTags,
  expandAdvancedSettings,
  fillReferenceUrls,
  fillFalsePositiveExamples,
  fillThreat,
  fillThreatTechnique,
  fillThreatSubtechnique,
  fillNote,
  fillFrom,
  createAndEnableRule,
  waitForAlertsToPopulate,
  goToAboutStepTab,
  goToScheduleStepTab,
  goToActionsStepTab,
  fillAboutRule,
} from '../../tasks/create_new_rule';
import { saveEditedRule } from '../../tasks/edit_rule';
import { login, visit, visitSecurityDetectionRulesPage } from '../../tasks/login';
import { deleteSelectedRules } from '../../tasks/rules_bulk_edit';
import { getDetails, waitForTheRuleToBeExecuted, enablesRule } from '../../tasks/rule_details';
import { RULE_CREATION } from '../../urls/navigation';

describe('Custom query rules', () => {
  beforeEach(() => {
    deleteAlertsAndRules();
  });

  describe('Custom detection rules creation', () => {
    beforeEach(() => {
      createTimeline(getTimeline())
        .then((response) => {
          return response.body.data.persistTimeline.timeline.savedObjectId;
        })
        .as('timelineId');
      login();
    });

    it('Creates and enables a new rule', function () {
      visit(RULE_CREATION);

      cy.log('Filling define section');
      importSavedQuery(this.timelineId);
      cy.get(DEFINE_CONTINUE_BUTTON).click();

      cy.log('Filling about section');
      fillRuleName('Test Rule');
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
      cy.get(ABOUT_CONTINUE_BTN).click();

      cy.log('Filling schedule section');
      fillFrom();

      // expect define step to repopulate
      cy.get(DEFINE_EDIT_BUTTON).click();
      cy.get(CUSTOM_QUERY_INPUT).should('have.value', ruleFields.ruleQuery);
      cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

      // expect about step to populate
      cy.get(ABOUT_EDIT_BUTTON).click();
      cy.get(RULE_NAME_INPUT).invoke('val').should('eql', ruleFields.ruleName);
      cy.get(ABOUT_CONTINUE_BTN).should('exist').click();
      cy.get(SCHEDULE_CONTINUE_BUTTON).click();

      createAndEnableRule();

      cy.log('Asserting we have a new rule created');
      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      cy.log('Asserting rule view in rules list');
      expectManagementTableRules(['Test Rule']);
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
      cy.get(INVESTIGATION_NOTES_TOGGLE).click();
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
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .should('match', /^[1-9].+$/); // Any number of alerts
      cy.get(ALERT_GRID_CELL).contains(ruleFields.ruleName);
    });
  });

  describe('Custom detection rules deletion and edition', () => {
    context('Deletion', () => {
      beforeEach(() => {
        createRule(
          getNewRule({ rule_id: 'rule1', name: 'New Rule Test', enabled: false, max_signals: 500 })
        );
        createRule(
          getNewOverrideRule({
            rule_id: 'rule2',
            name: 'Override Rule',
            enabled: false,
            max_signals: 500,
          })
        );
        createRule(getExistingRule({ rule_id: 'rule3', name: 'Rule 1', enabled: false }));
        login();
        visitSecurityDetectionRulesPage();
      });

      it('Deletes one rule', () => {
        getRulesManagementTableRows().then((rules) => {
          const initialNumberOfRules = rules.length;
          const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

          cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
            const numberOfRules = body.data.length;
            expect(numberOfRules).to.eql(initialNumberOfRules);
          });

          deleteFirstRule();

          getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
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
        getRulesManagementTableRows().then((rules) => {
          const rulesToDelete = ['New Rule Test', 'Override Rule'] as const;
          const initialNumberOfRules = rules.length;
          const numberOfRulesToBeDeleted = 2;
          const expectedNumberOfRulesAfterDeletion =
            initialNumberOfRules - numberOfRulesToBeDeleted;

          selectRulesByName(rulesToDelete);
          deleteSelectedRules();

          getRulesManagementTableRows()
            .first()
            .within(() => {
              cy.get(RULE_SWITCH).should('not.exist');
            });

          getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
          cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
            const numberOfRules = body.data.length;
            expect(numberOfRules).to.eql(expectedNumberOfRulesAfterDeletion);
          });
          getRulesManagementTableRows()
            .first()
            .within(() => {
              cy.get(RULE_SWITCH).should('exist');
            });
          cy.get(CUSTOM_RULES_BTN).should(
            'have.text',
            `Custom rules (${expectedNumberOfRulesAfterDeletion})`
          );
        });
      });

      it('Deletes one rule from detail page', () => {
        getRulesManagementTableRows().then((rules) => {
          const initialNumberOfRules = rules.length;
          const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

          goToTheRuleDetailsOf('New Rule Test');
          cy.intercept('POST', '/api/detection_engine/rules/_bulk_delete').as('deleteRule');

          deleteRuleFromDetailsPage();

          // @ts-expect-error update types
          cy.waitFor('@deleteRule').then(() => {
            cy.get(RULES_MANAGEMENT_TABLE).should('exist');
            getRulesManagementTableRows().should('have.length', expectedNumberOfRulesAfterDeletion);
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
      const expectedEditedIndexPatterns = rule.index;

      beforeEach(() => {
        deleteConnectors();
        createRule(getExistingRule({ rule_id: 'rule1', enabled: true }));
        login();
        visitSecurityDetectionRulesPage();
      });

      it('Only modifies rule active status on enable/disable', () => {
        enablesRule();

        cy.intercept('GET', `/api/detection_engine/rules?id=*`).as('fetchRuleDetails');

        goToRuleDetails();

        cy.wait('@fetchRuleDetails').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);

          cy.wrap(response?.body.max_signals).should('eql', getExistingRule().max_signals);
          cy.wrap(response?.body.enabled).should('eql', false);
        });
      });

      it('Allows a rule to be edited', () => {
        const existingRule = getExistingRule();

        editFirstRule();

        // expect define step to populate
        cy.get(CUSTOM_QUERY_INPUT).should('have.value', existingRule.query);

        cy.get(DEFINE_INDEX_INPUT).should('have.text', existingRule.index?.join(''));

        goToAboutStepTab();

        // expect about step to populate
        cy.get(RULE_NAME_INPUT).invoke('val').should('eql', existingRule.name);
        cy.get(RULE_DESCRIPTION_INPUT).should('have.text', existingRule.description);
        cy.get(TAGS_FIELD).should('have.text', existingRule.tags?.join(''));
        cy.get(SEVERITY_DROPDOWN).should('have.text', 'High');
        cy.get(DEFAULT_RISK_SCORE_INPUT).invoke('val').should('eql', `${existingRule.risk_score}`);

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

        addEmailConnectorAndRuleAction('test@example.com', 'Subject');

        cy.get(ACTIONS_SUMMARY_BUTTON).should('have.text', 'Summary of alerts');
        cy.get(ACTIONS_NOTIFY_WHEN_BUTTON).should('have.text', 'Per rule run');

        goToAboutStepTab();
        cy.get(TAGS_CLEAR_BUTTON).click();
        fillAboutRule(getEditedRule());

        cy.intercept('GET', '/api/detection_engine/rules?id*').as('getRule');

        saveEditedRule();

        cy.wait('@getRule').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);
          // ensure that editing rule does not modify max_signals
          cy.wrap(response?.body.max_signals).should('eql', existingRule.max_signals);
        });

        cy.get(RULE_NAME_HEADER).should('contain', `${getEditedRule().name}`);
        cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', getEditedRule().description);
        cy.get(ABOUT_DETAILS).within(() => {
          getDetails(SEVERITY_DETAILS).should('have.text', 'Medium');
          getDetails(RISK_SCORE_DETAILS).should('have.text', `${getEditedRule().risk_score}`);
          getDetails(TAGS_DETAILS).should('have.text', expectedEditedtags);
        });
        cy.get(INVESTIGATION_NOTES_TOGGLE).click();
        cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', getEditedRule().note);
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(INDEX_PATTERNS_DETAILS).should(
            'have.text',
            expectedEditedIndexPatterns?.join('')
          );
          getDetails(CUSTOM_QUERY_DETAILS).should('have.text', getEditedRule().query);
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
