/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMELINE_ROW_RENDERERS_DISABLE_ALL_BTN,
  TIMELINE_ROW_RENDERERS_MODAL_CLOSE_BUTTON,
  TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX,
  TIMELINE_ROW_RENDERERS_SEARCHBOX,
  TIMELINE_SHOW_ROW_RENDERERS_GEAR,
} from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL } from '../../urls/navigation';

const RowRenderersId = [
  'alerts',
  'auditd',
  'auditd_file',
  'library',
  'netflow',
  'plain',
  'registry',
  'suricata',
  'system',
  'system_dns',
  'system_endgame_process',
  'system_file',
  'system_fim',
  'system_security_event',
  'system_socket',
  'threat_match',
  'zeek',
];

describe('Row renderers', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
    openTimelineUsingToggle();
    populateTimeline();
    cy.get(TIMELINE_SHOW_ROW_RENDERERS_GEAR).first().click({ force: true });
  });

  afterEach(() => {
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_CLOSE_BUTTON).click({ force: true });
  });

  it('Row renderers should be enabled by default', () => {
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).should('exist');
    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).should('be.checked');
  });

  it('Selected renderer can be disabled and enabled', () => {
    cy.get(TIMELINE_ROW_RENDERERS_SEARCHBOX).type('flow');

    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).first().uncheck();
    cy.intercept('PATCH', '/api/timeline').as('updateTimeline');

    cy.wait('@updateTimeline').then((interception) => {
      expect(interception.request.body.timeline.excludedRowRendererIds).to.contain('netflow');
    });

    cy.get(TIMELINE_ROW_RENDERERS_MODAL_ITEMS_CHECKBOX).first().check();

    cy.wait('@updateTimeline').then((interception) => {
      expect(interception.request.body.timeline.excludedRowRendererIds).not.to.contain('netflow');
    });
  });

  it('Selected renderer can be disabled with one click', () => {
    cy.get(TIMELINE_ROW_RENDERERS_DISABLE_ALL_BTN).click({ force: true });

    cy.intercept('PATCH', '/api/timeline').as('updateTimeline');
    cy.wait('@updateTimeline').its('response.statusCode').should('eq', 200);

    cy.wait('@updateTimeline').then((interception) => {
      expect(interception.request.body.timeline.excludedRowRendererIds).to.eql(RowRenderersId);
    });
  });
});
