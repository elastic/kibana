/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { getTimeline } from '../../../objects/timeline';

import {
  FAVORITE_TIMELINE,
  LOCKED_ICON,
  PIN_EVENT,
  TIMELINE_DESCRIPTION,
  TIMELINE_FLYOUT_WRAPPER,
  TIMELINE_QUERY,
  TIMELINE_TITLE,
} from '../../../screens/timeline';
import { TIMELINES_DESCRIPTION, TIMELINES_FAVORITE } from '../../../screens/timelines';
import { createRule } from '../../../tasks/api_calls/rules';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteTimelines } from '../../../tasks/common';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import {
  addFilter,
  addNameAndDescriptionToTimelineTemplate,
  clickingOnCreateTemplateFromTimelineBtn,
  closeTimeline,
  createNewTimelineTemplate,
  expandEventAction,
  markAsFavorite,
  populateTimeline,
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
    cy.intercept('PATCH', '/api/timeline').as('timeline');
  });

  it('Creates a timeline template', () => {
    createRule(getNewRule());
    visitWithoutDateRange(TIMELINES_URL);
    openTimelineUsingToggle();
    createNewTimelineTemplate();
    populateTimeline();
    addFilter(getTimeline().filter);
    cy.get(PIN_EVENT).should('be.visible');
    cy.get(LOCKED_ICON).should('be.visible');

    addNameAndDescriptionToTimelineTemplate(getTimeline());

    cy.wait('@timeline').then(({ response }) => {
      const timelineId = response?.body.data.persistTimeline.timeline.savedObjectId;
      markAsFavorite();
      createNewTimelineTemplate();
      closeTimeline();

      navigateToTimelineTemplates();

      cy.contains(getTimeline().title).should('exist');
      cy.get(TIMELINES_DESCRIPTION).first().should('have.text', getTimeline().description);
      cy.get(TIMELINES_FAVORITE).first().should('exist');

      openTimelineTemplate(timelineId);

      cy.get(FAVORITE_TIMELINE).should('exist');
      cy.get(TIMELINE_TITLE).should('have.text', getTimeline().title);
      cy.get(TIMELINE_DESCRIPTION).should('have.text', getTimeline().description);
      cy.get(TIMELINE_QUERY).should('have.text', `${getTimeline().query} `);
    });
  });

  it('Create template from timeline', () => {
    createTimeline(getTimeline());
    visitWithoutDateRange(TIMELINES_URL);
    waitForTimelinesPanelToBeLoaded();
    expandEventAction();
    clickingOnCreateTemplateFromTimelineBtn();

    cy.wait('@timeline', { timeout: 100000 });
    cy.get(TIMELINE_FLYOUT_WRAPPER).should('have.css', 'visibility', 'visible');
    cy.get(TIMELINE_DESCRIPTION).should('have.text', getTimeline().description);
    cy.get(TIMELINE_QUERY).should('have.text', getTimeline().query);
  });
});
