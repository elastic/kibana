/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../objects/timeline';
import { ROLES } from '../../../common/test';

import {
  LOCKED_ICON,
  NOTES_TEXT,
  PIN_EVENT,
  SERVER_SIDE_EVENT_COUNT,
  TIMELINE_DESCRIPTION,
  TIMELINE_FILTER,
  TIMELINE_FLYOUT_WRAPPER,
  TIMELINE_QUERY,
  TIMELINE_PANEL,
  TIMELINE_TAB_CONTENT_EQL,
  TIMELINE_TAB_CONTENT_GRAPHS_NOTES,
  EDIT_TIMELINE_BTN,
  EDIT_TIMELINE_TOOLTIP,
} from '../../screens/timeline';
import { createTimelineTemplate } from '../../tasks/api_calls/timelines';

import { cleanKibana, deleteTimelines } from '../../tasks/common';
import { login, visit, visitWithoutDateRange } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { selectCustomTemplates } from '../../tasks/templates';
import {
  addEqlToTimeline,
  addFilter,
  addNameAndDescriptionToTimeline,
  addNotesToTimeline,
  clickingOnCreateTimelineFormTemplateBtn,
  closeTimeline,
  createNewTimeline,
  expandEventAction,
  goToQueryTab,
  pinFirstEvent,
  populateTimeline,
} from '../../tasks/timeline';

import { OVERVIEW_URL, TIMELINE_TEMPLATES_URL } from '../../urls/navigation';

describe('Create a timeline from a template', () => {
  before(() => {
    deleteTimelines();
    createTimelineTemplate(getTimeline());
    visitWithoutDateRange(TIMELINE_TEMPLATES_URL);
  });

  it('Should have the same query and open the timeline modal', () => {
    selectCustomTemplates();
    expandEventAction();
    clickingOnCreateTimelineFormTemplateBtn();

    cy.get(TIMELINE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
    cy.get(TIMELINE_DESCRIPTION).should('have.text', getTimeline().description);
    cy.get(TIMELINE_QUERY).should('have.text', getTimeline().query);
    closeTimeline();
  });
});

describe('Timelines', (): void => {
  before(() => {
    cleanKibana();
    login();
    visit(OVERVIEW_URL);
  });

  describe('Toggle create timeline from plus icon', () => {
    after(() => {
      closeTimeline();
    });
    context('Privileges: CRUD', () => {
      it('toggle create timeline ', () => {
        createNewTimeline();
        addNameAndDescriptionToTimeline(getTimeline());
        cy.get(TIMELINE_PANEL).should('be.visible');
      });
    });

    context('Privileges: READ', () => {
      before(() => {
        login(ROLES.reader);
        visit(OVERVIEW_URL, undefined, ROLES.reader);
      });
      it('should not be able to create/update timeline ', () => {
        createNewTimeline();
        cy.get(TIMELINE_PANEL).should('be.visible');
        cy.get(EDIT_TIMELINE_BTN).should('be.disabled');
        cy.get(EDIT_TIMELINE_BTN).first().trigger('mouseover', { force: true });
        cy.get(EDIT_TIMELINE_TOOLTIP).should('be.visible');
        cy.get(EDIT_TIMELINE_TOOLTIP).should(
          'have.text',
          'You can use Timeline to investigate events, but you do not have the required permissions to save timelines for future use. If you need to save timelines, contact your Kibana administrator.'
        );
      });
    });
  });

  describe('Creates a timeline by clicking untitled timeline from bottom bar', () => {
    after(() => {
      closeTimeline();
    });

    before(() => {
      login();
      visit(OVERVIEW_URL);
      openTimelineUsingToggle();
      addNameAndDescriptionToTimeline(getTimeline());
      populateTimeline();
    });

    beforeEach(() => {
      goToQueryTab();
    });

    it('can be added filter', () => {
      addFilter(getTimeline().filter);
      cy.get(TIMELINE_FILTER(getTimeline().filter)).should('exist');
    });

    it('pins an event', () => {
      pinFirstEvent();
      cy.get(PIN_EVENT)
        .should('have.attr', 'aria-label')
        .and('match', /Unpin the event in row 2/);
    });

    it('has a lock icon', () => {
      cy.get(LOCKED_ICON).should('be.visible');
    });

    it('can be added notes', () => {
      addNotesToTimeline(getTimeline().notes);
      cy.get(TIMELINE_TAB_CONTENT_GRAPHS_NOTES)
        .find(NOTES_TEXT)
        .should('have.text', getTimeline().notes);
    });

    it('should update timeline after adding eql', () => {
      cy.intercept('PATCH', '/api/timeline').as('updateTimeline');
      const eql = 'any where process.name == "zsh"';
      addEqlToTimeline(eql);

      cy.wait('@updateTimeline', { timeout: 10000 }).its('response.statusCode').should('eq', 200);

      cy.get(`${TIMELINE_TAB_CONTENT_EQL} ${SERVER_SIDE_EVENT_COUNT}`)
        .invoke('text')
        .then(parseInt)
        .should('be.gt', 0);
    });
  });
});
