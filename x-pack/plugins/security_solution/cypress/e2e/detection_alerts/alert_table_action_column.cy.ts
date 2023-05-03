/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  CLOSE_OVERLAY,
  OVERLAY_CONTAINER,
  SESSION_VIEWER_BUTTON,
  ANALYZER_VIEWER_BUTTON,
} from '../../screens/alerts';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad } from '../../tasks/es_archiver';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';

describe('Alerts Table Action column', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('process_ancestory');
    login();
    createRule(getNewRule());
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  it('session viewer button and session viewer should be visible', () => {
    cy.get(SESSION_VIEWER_BUTTON).should('be.visible');
    cy.get(SESSION_VIEWER_BUTTON).eq(0).trigger('click');
    cy.get(OVERLAY_CONTAINER).should('be.visible');
    cy.get(CLOSE_OVERLAY).trigger('click');
  });

  it('analyser should be visible', () => {
    cy.get(ANALYZER_VIEWER_BUTTON).should('be.visible');
    cy.get(ANALYZER_VIEWER_BUTTON).eq(0).trigger('click');
    cy.get(OVERLAY_CONTAINER).should('be.visible');
    cy.get(CLOSE_OVERLAY).trigger('click');
  });
});
