/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { getTimeline } from '../../../objects/timeline';

import {
  LOCKED_ICON,
  PIN_EVENT,
  TIMELINE_TEMPLATE_DESCRIPTION,
  TIMELINE_TEMPLATE_FLYOUT_WRAPPER,
  TIMELINE_TEMPLATE_QUERY,
  TIMELINE_TEMPLATE_TITLE,
} from '../../../screens/timeline';
import {
  TIMELINES_DESCRIPTION_TEMPLATE,
  TIMELINES_TEMPLATE_FAVORITE,
} from '../../../screens/timelines';
import { createRule } from '../../../tasks/api_calls/rules';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteTimelines } from '../../../tasks/common';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  addFilter,
  addNameToTimelineTemplate,
  addDescriptionToTimelineTemplate,
  clickingOnCreateTemplateFromTimelineBtn,
  closeTimelineTemplate,
  createNewTimelineTemplate,
  expandEventAction,
  markAsFavorite,
  populateTimelineTemplate,
} from '../../../tasks/timeline';
import {
  navigateToTimelineTemplates,
  openTimelineTemplate,
  waitForTimelinesPanelToBeLoaded,
} from '../../../tasks/timelines';

import { TIMELINES_URL } from '../../../urls/navigation';

describe('Timeline Templates', () => {
  beforeEach(() => {
    login();
    deleteTimelines();
    cy.intercept('PATCH', '/api/timeline').as('timelineTemplate');
  });

  it('Creates a timeline template', () => {
    createRule(getNewRule());
    visitWithoutDateRange(TIMELINES_URL);
    openTimelineUsingToggle();
    createNewTimelineTemplate();
    populateTimelineTemplate();
    addFilter(getTimeline().filter);
    cy.get(PIN_EVENT).should('be.visible');
    cy.get(PIN_EVENT).should('be.disabled');
    cy.get(LOCKED_ICON).should('be.visible');

    addNameToTimelineTemplate(getTimeline().title);
    addDescriptionToTimelineTemplate(getTimeline().description);

    cy.wait('@timelineTemplate').then(({ response }) => {
      const timelineId = response?.body.data.persistTimeline.timeline.savedObjectId;
      markAsFavorite();
      cy.pause();
      createNewTimelineTemplate();
      closeTimelineTemplate();

      navigateToTimelineTemplates();

      cy.contains(getTimeline().title).should('exist');
      cy.get(TIMELINES_DESCRIPTION_TEMPLATE).first().should('have.text', getTimeline().description);
      cy.get(TIMELINES_TEMPLATE_FAVORITE).first().should('exist');

      openTimelineTemplate(timelineId);

      cy.get(TIMELINES_TEMPLATE_FAVORITE).should('exist');
      cy.get(TIMELINE_TEMPLATE_TITLE).should('have.text', getTimeline().title);
      cy.get(TIMELINE_TEMPLATE_DESCRIPTION).should('have.text', getTimeline().description);
      cy.get(TIMELINE_TEMPLATE_QUERY).should('have.text', `${getTimeline().query} `);
    });
  });

  it('Create template from timeline', () => {
    createTimeline(getTimeline());
    visitWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();
    expandEventAction();
    clickingOnCreateTemplateFromTimelineBtn();

    cy.wait('@timelineTemplate', { timeout: 100000 });
    cy.get(TIMELINE_TEMPLATE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
    cy.get(TIMELINE_TEMPLATE_DESCRIPTION).should('have.text', getTimeline().description);
    cy.get(TIMELINE_TEMPLATE_QUERY).should('have.text', getTimeline().query);
  });
});
