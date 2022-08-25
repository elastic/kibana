/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../common/constants';
import {
  ruleCheckboxByIdSelector,
  SELECTED_RULES_NUMBER_LABEL,
  SELECT_ALL_RULES_BTN,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
} from '../../screens/alerts_detection_rules';
import {
  loadPrebuiltDetectionRules,
  waitForPrebuiltDetectionRulesToBeLoaded,
} from '../../tasks/alerts_detection_rules';
import { cleanKibana } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';

describe('Rules selection', () => {
  before(() => {
    cleanKibana();
    login();

    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();
  });

  it('should correctly update the selection label when rules are individually selected and unselected', () => {
    cy.request({ url: DETECTION_ENGINE_RULES_URL_FIND }).then(({ body }) => {
      const [firstRule, secondRule] = body.data;

      cy.get(ruleCheckboxByIdSelector(firstRule.id)).click().should('be.checked');
      cy.get(ruleCheckboxByIdSelector(secondRule.id)).click().should('be.checked');

      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '2');

      cy.get(ruleCheckboxByIdSelector(firstRule.id)).click().should('not.be.checked');
      cy.get(ruleCheckboxByIdSelector(secondRule.id)).click().should('not.be.checked');

      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
    });
  });

  it('should correctly update the selection label when rules are bulk selected and then bulk un-selected', () => {
    cy.request({ url: DETECTION_ENGINE_RULES_URL_FIND }).then(({ body }) => {
      const numberOfRules = body.total;

      cy.get(SELECT_ALL_RULES_BTN).click();

      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', numberOfRules);

      const bulkSelectButton = cy.get(SELECT_ALL_RULES_BTN);

      // Un-select all rules via the Bulk Selection button from the Utility bar
      bulkSelectButton.click();

      // Current selection should be 0 rules
      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
      // Bulk selection button should be back to displaying all rules
      cy.get(SELECT_ALL_RULES_BTN).should('contain.text', numberOfRules);
    });
  });

  it('should correctly update the selection label when rules are bulk selected and then unselected via the table select all checkbox', () => {
    cy.request({ url: DETECTION_ENGINE_RULES_URL_FIND }).then(({ body }) => {
      const numberOfRules = body.total;

      cy.get(SELECT_ALL_RULES_BTN).click();

      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', numberOfRules);

      // Un-select all rules via the Un-select All checkbox from the table
      cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();

      // Current selection should be 0 rules
      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
      // Bulk selection button should be back to displaying all rules
      cy.get(SELECT_ALL_RULES_BTN).should('contain.text', numberOfRules);
    });
  });
});
