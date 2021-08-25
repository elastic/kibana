/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { PROVIDER_BADGE } from '../../screens/timeline';

import { investigateFirstAlertInTimeline, loadAlertsTableWithAlerts } from '../../tasks/alerts';
import { cleanKibana } from '../../tasks/common';

describe('Alerts investigate in timeline', () => {
  beforeEach(() => {
    cleanKibana();
    loadAlertsTableWithAlerts(getNewRule(), 100);
  });

  afterEach(() => {
    cleanKibana();
  });

  it('Investigate alert in default timeline', () => {
    investigateFirstAlertInTimeline();
    cy.get(PROVIDER_BADGE)
      .first()
      .invoke('text')
      .then((eventId) => {
        investigateFirstAlertInTimeline();
        cy.get(PROVIDER_BADGE).filter(':visible').should('have.text', eventId);
      });
  });
});
