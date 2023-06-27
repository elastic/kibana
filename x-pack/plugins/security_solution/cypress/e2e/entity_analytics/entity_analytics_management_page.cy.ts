/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PAGE_TITLE,
  HOST_RISK_PREVIEW_TABLE,
  HOST_RISK_PREVIEW_TABLE_ROWS,
  USER_RISK_PREVIEW_TABLE,
  USER_RISK_PREVIEW_TABLE_ROWS,
  RISK_PREVIEW_ERROR,
  RISK_PREVIEW_ERROR_BUTTON,
} from '../../screens/entity_analytics_management';

import { login, visit, visitWithoutDateRange } from '../../tasks/login';
import { cleanKibana } from '../../tasks/common';
import { ENTITY_ANALYTICS_MANAGEMENT_URL, ALERTS_URL } from '../../urls/navigation';
import { esArchiverLoad, esArchiverUnload, esArchiverResetKibana } from '../../tasks/es_archiver';
import { getNewRule } from '../../objects/rule';
import { createRule } from '../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import {
  SHOW_DATES_BUTTON,
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_ABSOLUTE_INPUT,
  LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON,
  LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON,
  LOCAL_DATE_PICKER_APPLY_BUTTON_TIMELINE,
} from '../../screens/date_picker';

describe(
  'Entity analytics management page',
  { env: { ftrConfig: { enableExperimental: ['riskScoringRoutesEnabled'] } } },
  () => {
    before(() => {
      esArchiverResetKibana();
      cleanKibana();
    });

    beforeEach(() => {
      login();
      esArchiverLoad('all_users');
      visitWithoutDateRange(ALERTS_URL);
      createRule(getNewRule({ query: 'user.name:* or host.name:*', risk_score: 70 }));
      waitForAlertsToPopulate();
      visit(ENTITY_ANALYTICS_MANAGEMENT_URL);
    });

    after(() => {
      esArchiverUnload('all_users');
    });

    it('renders page as expected', () => {
      cy.get(`${PAGE_TITLE}`).should('have.text', 'Entity Analytics');
    });

    describe('Risk preview', () => {
      it('there is data for risk and host preview react on date range', () => {
        const START_DATE = 'Jan 18, 2019 @ 20:33:29.186';
        const END_DATE = 'Jan 19, 2019 @ 20:33:29.186';

        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);

        cy.get('.euiSuperDatePicker');
        cy.get('body').then(($container) => {
          if ($container.find(SHOW_DATES_BUTTON).length > 0) {
            cy.get(SHOW_DATES_BUTTON).click({ force: true });
          } else {
            cy.get(LOCAL_DATE_PICKER_START_DATE_POPOVER_BUTTON).click({ force: true });
          }
        });

        cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

        cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
        cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
        cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(START_DATE);

        cy.get(LOCAL_DATE_PICKER_APPLY_BUTTON_TIMELINE).click();
        cy.get(LOCAL_DATE_PICKER_APPLY_BUTTON_TIMELINE).should('not.have.text', 'Updating');

        cy.get(LOCAL_DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

        cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

        cy.get(DATE_PICKER_ABSOLUTE_INPUT).click();
        cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear();
        cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(END_DATE);
        cy.get(LOCAL_DATE_PICKER_APPLY_BUTTON_TIMELINE).click();

        cy.get(HOST_RISK_PREVIEW_TABLE).contains('No items found');
        cy.get(USER_RISK_PREVIEW_TABLE).contains('No items found');
      });

      it('Show error panel if API returns error', () => {
        cy.intercept('POST', '/internal/risk_score/preview', {
          statusCode: 500,
        });

        cy.get(RISK_PREVIEW_ERROR).contains('Preview failed');

        cy.intercept('POST', '/internal/risk_score/preview', {
          statusCode: 200,
          body: {
            scores: [],
          },
        });

        cy.get(RISK_PREVIEW_ERROR_BUTTON).click();

        cy.get(RISK_PREVIEW_ERROR).should('not.exist');
      });
    });
  }
);
