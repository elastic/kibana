/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRule } from '../../objects/rule';
import { getNewThreatIndicatorRule } from '../../objects/rule';
import {
  ALERTS_COUNT,
  ALERT_TABLE_ADDITIONAL_CONTROLS,
  ALERT_TABLE_SHOW_THREAT_INDICATOR,
} from '../../screens/alerts';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { cleanKibana } from '../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineIndicatorMatchRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectIndicatorMatchType,
  waitForAlertsToPopulate,
} from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visit, visitWithoutDateRange } from '../../tasks/login';
import { ALERTS_URL, RULE_CREATION } from '../../urls/navigation';

describe('Threat Indicator', () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('threat_indicator');
    esArchiverLoad('suspicious_source_event');
    login();
    const rule = getNewThreatIndicatorRule();
    visitWithoutDateRange(RULE_CREATION);
    selectIndicatorMatchType();
    fillDefineIndicatorMatchRuleAndContinue(rule);
    fillAboutRuleAndContinue({ name: rule.name, description: rule.description } as CustomRule);
    fillScheduleRuleAndContinue(rule);
    createAndEnableRule();
  });

  after(() => {
    esArchiverUnload('threat_indicator');
    esArchiverUnload('suspicious_source_event');
  });

  it('Rule Details Page', () => {
    goToRuleDetails();
    waitForAlertsToPopulate();
    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
    cy.get(ALERT_TABLE_ADDITIONAL_CONTROLS).trigger('click');
    cy.get(ALERT_TABLE_SHOW_THREAT_INDICATOR)
      .pipe(($el) => $el.trigger('click'))
      .should('be.checked');
    waitForAlertsToPopulate();
    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
  });

  it('Alert Page', () => {
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
    cy.get(ALERT_TABLE_ADDITIONAL_CONTROLS).trigger('click');
    cy.get(ALERT_TABLE_SHOW_THREAT_INDICATOR)
      .pipe(($el) => $el.trigger('click'))
      .should('be.checked');
    waitForAlertsToPopulate();
    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
  });
});
