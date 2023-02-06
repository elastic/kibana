/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import type { Mitre } from '../../objects/rule';
import { getDataViewRule } from '../../objects/rule';
import type { CompleteTimeline } from '../../objects/timeline';
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
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
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
  DATA_VIEW_DETAILS,
  EDIT_RULE_SETTINGS_LINK,
} from '../../screens/rule_details';

import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { postDataView } from '../../tasks/common';
import {
  createAndEnableRule,
  createRuleWithoutEnabling,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleAndContinue,
  fillScheduleRuleAndContinue,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';

import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visit } from '../../tasks/login';
import { getDetails } from '../../tasks/rule_details';

import { RULE_CREATION } from '../../urls/navigation';

describe('Custom query rules', () => {
  before(() => {
    login();
  });

  describe('Custom detection rules creation with data views', () => {
    const rule = getDataViewRule();
    const expectedUrls = rule.referenceUrls?.join('');
    const expectedFalsePositives = rule.falsePositivesExamples?.join('');
    const expectedTags = rule.tags?.join('');
    const mitreAttack = rule.mitre as Mitre[];
    const expectedMitre = formatMitreAttackDescription(mitreAttack);
    const expectedNumberOfRules = 1;

    beforeEach(() => {
      /* We don't call cleanKibana method on the before hook, instead we call esArchiverReseKibana on the before each. This is because we 
      are creating a data view we'll use after and cleanKibana does not delete all the data views created, esArchiverReseKibana does.
      We don't use esArchiverReseKibana in all the tests because is a time-consuming method and we don't need to perform an exhaustive 
      cleaning in all the other tests. */
      const timeline = rule.timeline as CompleteTimeline;
      esArchiverResetKibana();
      createTimeline(timeline).then((response) => {
        cy.wrap({
          ...rule,
          timeline: {
            ...timeline,
            id: response.body.data.persistTimeline.timeline.savedObjectId,
          },
        }).as('rule');
      });
      if (rule.dataSource.type === 'dataView') {
        postDataView(rule.dataSource.dataView);
      }
    });

    it('Creates and enables a new rule', function () {
      visit(RULE_CREATION);
      fillDefineCustomRuleAndContinue(this.rule);
      fillAboutRuleAndContinue(this.rule);
      fillScheduleRuleAndContinue(this.rule);
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
        getDetails(DATA_VIEW_DETAILS).should('have.text', this.rule.dataSource.dataView);
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', this.rule.customQuery);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      cy.get(DEFINITION_DETAILS).should('not.contain', INDEX_PATTERNS_DETAILS);
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS).should(
          'have.text',
          `${getDataViewRule().runsEvery?.interval}${getDataViewRule().runsEvery?.type}`
        );
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
          'have.text',
          `${getDataViewRule().lookBack?.interval}${getDataViewRule().lookBack?.type}`
        );
      });

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(NUMBER_OF_ALERTS)
        .invoke('text')
        .should('match', /^[1-9].+$/);
      cy.get(ALERT_GRID_CELL).contains(this.rule.name);
    });
    it('Creates and edits a new rule with a data view', function () {
      visit(RULE_CREATION);
      fillDefineCustomRuleAndContinue(this.rule);
      cy.get(RULE_NAME_INPUT).clear({ force: true }).type(this.rule.name, { force: true });
      cy.get(RULE_DESCRIPTION_INPUT)
        .clear({ force: true })
        .type(this.rule.description, { force: true });

      cy.get(ABOUT_CONTINUE_BTN).should('exist').click({ force: true });

      fillScheduleRuleAndContinue(this.rule);
      createRuleWithoutEnabling();

      goToRuleDetails();

      cy.get(EDIT_RULE_SETTINGS_LINK).click({ force: true });

      cy.get(RULE_NAME_HEADER).should('contain', 'Edit rule settings');
    });
  });
});
