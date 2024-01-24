/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { takeOsqueryActionWithParams } from '../../tasks/live_query';
import { ServerlessRoleName } from '../../support/roles';

describe.skip('ALL - Timelines', { tags: ['@ess'] }, () => {
  before(() => {
    initializeDataViews();
  });
  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
  });

  it('should substitute osquery parameter on non-alert event take action', () => {
    cy.visit('/app/security/timelines');
    cy.getBySel('timeline-bottom-bar').within(() => {
      cy.getBySel('timeline-bottom-bar-title-button').click();
    });
    cy.getBySel('timelineQueryInput').type('NOT host.name: "dev-fleet-server.8220"{enter}');
    // Filter out alerts
    cy.getBySel('timeline-sourcerer-trigger').click();
    cy.getBySel('sourcerer-advanced-options-toggle').click();
    cy.getBySel('sourcerer-combo-box').within(() => {
      cy.getBySel('comboBoxClearButton').click();
      cy.getBySel('comboBoxInput').type(
        'logs-*{downArrow}{enter}filebeat-*{downArrow}{enter}{esc}'
      );
    });
    cy.getBySel('sourcerer-save').click();

    cy.getBySel('event-actions-container')
      .first()
      .within(() => {
        cy.getBySel('expand-event')
          .first()
          .within(() => {
            cy.get(`[data-is-loading="true"]`).should('not.exist');
          })
          .click();
      });
    takeOsqueryActionWithParams();
  });
});
