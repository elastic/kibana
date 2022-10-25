/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Timeline } from '../../objects/timeline';
import {
  MODAL_CONFIRMATION_BTN,
  MODAL_CONFIRMATION_CANCEL_BTN,
} from '../../screens/alerts_detection_rules';
import {
  ALERTS_PAGE,
  APP_LEAVE_CONFIRM_MODAL,
  CASES_PAGE,
  MANAGE_PAGE,
  OBSERVABILITY_ALERTS_PAGE,
} from '../../screens/kibana_navigation';
import { TIMELINE_SAVE_MODAL } from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';
import {
  navigateFromKibanaCollapsibleTo,
  openKibanaNavigation,
} from '../../tasks/kibana_navigation';
import { login, visit } from '../../tasks/login';
import { closeTimelineUsingToggle } from '../../tasks/security_main';
import {
  addNameAndDescriptionToTimeline,
  createNewTimeline,
  populateTimeline,
  waitForTimelineChanges,
} from '../../tasks/timeline';
import { HOSTS_URL, MANAGE_URL } from '../../urls/navigation';

describe('Save Timeline Prompts', () => {
  before(() => {
    cleanKibana();
    login();
    /*
     * When timeline changes are pending, chrome would popup with
     * a confirm dialog stating that `you can lose unsaved changed.
     * Below changes will disable that.
     *
     * */
    cy.window().then((win) => {
      win.onbeforeunload = null;
    });
  });

  beforeEach(() => {
    visit(HOSTS_URL);
    createNewTimeline();
  });

  it('unchanged & unsaved timeline should NOT prompt when user navigates away', () => {
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.url().should('not.contain', HOSTS_URL);
  });

  it('Changed & unsaved timeline should prompt when user navigates away from security solution', () => {
    populateTimeline();
    waitForTimelineChanges();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
  });

  it('Changed & unsaved timeline should NOT prompt when user navigates away within security solution where timelines are enabled', () => {
    populateTimeline();

    waitForTimelineChanges();
    closeTimelineUsingToggle();
    // navigate to any other page in security solution
    openKibanaNavigation();
    cy.get(CASES_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('not.exist');
  });

  it('Changed & unsaved timeline should prompt when user navigates away within security solution where timelines are disbaled eg. admin screen', () => {
    populateTimeline();
    waitForTimelineChanges();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
  });

  it('Changed & saved timeline should NOT prompt when user navigates away out of security solution', () => {
    populateTimeline();
    waitForTimelineChanges();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_CANCEL_BTN).click();
    addNameAndDescriptionToTimeline(
      {
        title: 'Some Timeline',
        description: 'Some Timeline',
      } as Timeline,
      true
    );
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    cy.url().should('not.contain', HOSTS_URL);
  });

  it('Changed & saved timeline should NOT prompt when user navigates within security solution where timelines are disabled', () => {
    populateTimeline();
    waitForTimelineChanges();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_CANCEL_BTN).click();
    addNameAndDescriptionToTimeline(
      {
        title: 'Some Timeline',
        description: 'Some Timeline',
      } as Timeline,
      true
    );
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.url().should('not.contain', HOSTS_URL);
  });

  it('When user navigates to the page where timeline is present, Time save modal should not exists.', () => {
    populateTimeline();
    waitForTimelineChanges();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();

    // Navigate back to HOSTS_URL and ensure that
    // timeline save modal is NOT present

    openKibanaNavigation();
    cy.get(ALERTS_PAGE).click();
    cy.get(TIMELINE_SAVE_MODAL).should('not.exist');
  });

  it('Changed and unsaved timeline should NOT prompt when user navigates from the page where timeline is disabled', () => {
    populateTimeline();
    waitForTimelineChanges();
    closeTimelineUsingToggle();
    openKibanaNavigation();
    cy.get(MANAGE_PAGE).click();
    cy.get(APP_LEAVE_CONFIRM_MODAL).should('be.visible');
    cy.get(MODAL_CONFIRMATION_BTN).click();
    // now we have come from MANAGE_PAGE where timeline is disabled
    // to outside app where timeline is not present.
    // There should be NO confirmation model in that case.
    openKibanaNavigation();
    navigateFromKibanaCollapsibleTo(OBSERVABILITY_ALERTS_PAGE);
    // should not be manage page i.e. successfull navigation
    cy.get(TIMELINE_SAVE_MODAL).should('not.exist');
    cy.url().should('not.contain', MANAGE_URL);
  });
});
