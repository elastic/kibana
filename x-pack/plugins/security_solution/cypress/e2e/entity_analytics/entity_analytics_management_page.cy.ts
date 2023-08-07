/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';

import {
  PAGE_TITLE,
  HOST_RISK_PREVIEW_TABLE,
  HOST_RISK_PREVIEW_TABLE_ROWS,
  USER_RISK_PREVIEW_TABLE,
  USER_RISK_PREVIEW_TABLE_ROWS,
  RISK_PREVIEW_ERROR,
  LOCAL_QUERY_BAR_SELECTOR,
  RISK_SCORE_ERROR_PANEL,
  RISK_SCORE_STATUS,
} from '../../screens/entity_analytics_management';

import { deleteRiskScore, installRiskScoreModule } from '../../tasks/api_calls/risk_scores';
import { RiskScoreEntity } from '../../tasks/risk_scores/common';
import { login, visit, visitWithoutDateRange } from '../../tasks/login';
import { cleanKibana } from '../../tasks/common';
import { ENTITY_ANALYTICS_MANAGEMENT_URL, ALERTS_URL } from '../../urls/navigation';
import { getNewRule } from '../../objects/rule';
import { createRule } from '../../tasks/api_calls/rules';
import {
  deleteConfiguration,
  interceptRiskPreviewError,
  interceptRiskPreviewSuccess,
  interceptRiskInitError,
} from '../../tasks/api_calls/risk_engine';
import { updateDateRangeInLocalDatePickers } from '../../tasks/date_picker';
import { fillLocalSearchBar, submitLocalSearch } from '../../tasks/search_bar';
import {
  riskEngineStatusChange,
  updateRiskEngine,
  updateRiskEngineConfirm,
  previewErrorButtonClick,
} from '../../tasks/entity_analytics';

describe(
  'Entity analytics management page',
  {
    env: { ftrConfig: { enableExperimental: ['riskScoringRoutesEnabled'] } },
    tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS],
  },
  () => {
    before(() => {
      cleanKibana();
      cy.task('esArchiverLoad', 'all_users');
    });

    beforeEach(() => {
      login();
      visitWithoutDateRange(ALERTS_URL);
      createRule(getNewRule({ query: 'user.name:* or host.name:*', risk_score: 70 }));
      deleteConfiguration();
      visit(ENTITY_ANALYTICS_MANAGEMENT_URL);
    });

    after(() => {
      cy.task('esArchiverUnload', 'all_users');
    });

    it('renders page as expected', () => {
      cy.get(PAGE_TITLE).should('have.text', 'Entity Risk Score');
    });

    describe('Risk preview', () => {
      it('risk scores reacts on change in datepicker', () => {
        const START_DATE = 'Jan 18, 2019 @ 20:33:29.186';
        const END_DATE = 'Jan 19, 2019 @ 20:33:29.186';

        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);

        updateDateRangeInLocalDatePickers(LOCAL_QUERY_BAR_SELECTOR, START_DATE, END_DATE);

        cy.get(HOST_RISK_PREVIEW_TABLE).contains('No items found');
        cy.get(USER_RISK_PREVIEW_TABLE).contains('No items found');
      });

      it('risk scores reacts on change in search bar query', () => {
        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);

        fillLocalSearchBar('host.name: "test-host1"');
        submitLocalSearch(LOCAL_QUERY_BAR_SELECTOR);

        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).should('have.length', 1);
        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).contains('test-host1');
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).should('have.length', 1);
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).contains('test1');
      });

      it('show error panel if API returns error and then try to refetch data', () => {
        interceptRiskPreviewError();

        cy.get(RISK_PREVIEW_ERROR).contains('Preview failed');

        interceptRiskPreviewSuccess();

        previewErrorButtonClick();

        cy.get(RISK_PREVIEW_ERROR).should('not.exist');
      });
    });

    describe('Risk engine', () => {
      it('should init, disable and enable risk engine', () => {
        cy.get(RISK_SCORE_STATUS).should('have.text', 'Off');

        // init
        riskEngineStatusChange();

        cy.get(RISK_SCORE_STATUS).should('have.text', 'On');

        // disable
        riskEngineStatusChange();

        cy.get(RISK_SCORE_STATUS).should('have.text', 'Off');

        // enable
        riskEngineStatusChange();

        cy.get(RISK_SCORE_STATUS).should('have.text', 'On');
      });

      it('should show error panel if API returns error ', () => {
        cy.get(RISK_SCORE_STATUS).should('have.text', 'Off');

        interceptRiskInitError();

        // init
        riskEngineStatusChange();

        cy.get(RISK_SCORE_ERROR_PANEL).contains('Sorry, there was an error');
      });

      it('should update if there legacy risk score installed', () => {
        installRiskScoreModule();
        visit(ENTITY_ANALYTICS_MANAGEMENT_URL);

        cy.get(RISK_SCORE_STATUS).should('not.exist');

        updateRiskEngine();
        updateRiskEngineConfirm();

        cy.get(RISK_SCORE_STATUS).should('have.text', 'On');

        deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId: 'default' });
      });
    });
  }
);
