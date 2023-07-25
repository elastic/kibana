/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataViewRule } from '../../../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RULE_NAME,
  RULES_ROW,
  RULES_MANAGEMENT_TABLE,
  RULE_SWITCH,
} from '../../../screens/alerts_detection_rules';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { postDataView } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineCustomRuleAndContinue,
  fillScheduleRuleAndContinue,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';
import { RULE_CREATION } from '../../../urls/navigation';

describe('Custom query rule using data view', () => {
  const rule = getDataViewRule();
  const expectedNumberOfRules = 1;

  beforeEach(() => {
    /* We don't call cleanKibana method on the before hook, instead we call esArchiverReseKibana on the before each. This is because we
      are creating a data view we'll use after and cleanKibana does not delete all the data views created, esArchiverReseKibana does.
      We don't use esArchiverReseKibana in all the tests because is a time-consuming method and we don't need to perform an exhaustive
      cleaning in all the other tests. */
    cy.task('esArchiverResetKibana');

    if (rule.data_view_id != null) {
      postDataView(rule.data_view_id);
    }
    login();
  });

  it('Creates and enables a new rule', function () {
    visit(RULE_CREATION);
    fillDefineCustomRuleAndContinue(rule);
    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createAndEnableRule();

    cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

    cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', expectedNumberOfRules);
    cy.get(RULE_NAME).should('have.text', rule.name);
    cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
  });
});
