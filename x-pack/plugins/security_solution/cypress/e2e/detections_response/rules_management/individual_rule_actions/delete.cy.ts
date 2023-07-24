/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule, getExistingRule, getNewOverrideRule } from '../../../../objects/rule';

import {
  CUSTOM_RULES_BTN,
  RULES_ROW,
  RULES_MANAGEMENT_TABLE,
} from '../../../../screens/alerts_detection_rules';

import { deleteFirstRule } from '../../../../tasks/alerts_detection_rules';
import { createRule } from '../../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../../tasks/common';
import { login, visit } from '../../../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../../urls/navigation';

describe('Rules management, individual rule delete', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: 'rule1', enabled: false, max_signals: 500 }));
    createRule(getNewOverrideRule({ rule_id: 'rule2', enabled: false, max_signals: 500 }));
    createRule(getExistingRule({ rule_id: 'rule3', enabled: false }));
    login();
    visit(DETECTIONS_RULE_MANAGEMENT_URL);
  });

  it('Deletes one rule', () => {
    cy.get(RULES_MANAGEMENT_TABLE)
      .find(RULES_ROW)
      .then((rules) => {
        const initialNumberOfRules = rules.length;
        const expectedNumberOfRulesAfterDeletion = initialNumberOfRules - 1;

        cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
          const numberOfRules = body.data.length;
          expect(numberOfRules).to.eql(initialNumberOfRules);
        });

        deleteFirstRule();

        cy.get(RULES_MANAGEMENT_TABLE)
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
