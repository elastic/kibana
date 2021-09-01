/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esArchiverCCSLoad, esArchiverCCSUnload } from '../../tasks/es_archiver';
import { formatMitreAttackDescription } from '../../helpers/rules';
import { getEqlRule, getCCSEqlRule, getIndexPatterns } from '../../objects/rule';

import { ALERT_DATA_GRID, NUMBER_OF_ALERTS } from '../../screens/alerts';
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
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
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
  changeRowsPerPageTo100,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
  waitForRulesTableToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { createEventCorrelationRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineEqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectEqlRuleType,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { ALERTS_URL } from '../../urls/navigation';

describe('Detection rules', function () {
  const expectedNumberOfRules = 1;
  const expectedNumberOfAlerts = '100 alerts';

  beforeEach(function () {
    cleanKibana();
    esArchiverCCSLoad('run-parts');
    createTimeline(getCCSEqlRule().timeline).then((response) => {
      cy.wrap({
        ...getCCSEqlRule(),
        timeline: {
          ...getCCSEqlRule().timeline,
          id: response.body.data.persistTimeline.timeline.savedObjectId,
        },
      }).as('rule');
    });
  });

  afterEach(function () {
    esArchiverCCSUnload('run-parts');
  });

  it('Creates and activates a new EQL rule', function () {
    loginAndWaitForPageWithoutDateRange(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    goToManageAlertsDetectionRules();
    waitForRulesTableToBeLoaded();

    createEventCorrelationRule(this.rule);

    changeRowsPerPageTo100();

    cy.get(RULES_TABLE).then(($table) => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();
    goToRuleDetails();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(NUMBER_OF_ALERTS).should('have.text', expectedNumberOfAlerts);
    cy.get(ALERT_DATA_GRID)
      .invoke('text')
      .then((text) => {
        cy.log('ALERT_DATA_GRID', text);
        expect(text).contains(this.rule.name);
        expect(text).contains(this.rule.severity.toLowerCase());
        expect(text).contains(this.rule.riskScore);
      });
  });
});
