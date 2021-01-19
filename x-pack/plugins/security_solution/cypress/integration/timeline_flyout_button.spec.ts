/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON } from '../screens/security_main';
import {
  CREATE_NEW_TIMELINE,
  TIMELINE_DATA_PROVIDERS,
  TIMELINE_FLYOUT_HEADER,
  TIMELINE_SETTINGS_ICON,
} from '../screens/timeline';
import { cleanKibana } from '../tasks/common';

import { dragFirstHostToTimeline, waitForAllHostsToBeLoaded } from '../tasks/hosts/all_hosts';
import { loginAndWaitForPage } from '../tasks/login';
import {
  closeTimelineUsingCloseButton,
  closeTimelineUsingToggle,
  openTimelineUsingToggle,
} from '../tasks/security_main';

import { HOSTS_URL } from '../urls/navigation';

describe('timeline flyout button', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
    waitForAllHostsToBeLoaded();
  });

  it('toggles open the timeline', () => {
    openTimelineUsingToggle();
    cy.get(TIMELINE_FLYOUT_HEADER).should('have.css', 'visibility', 'visible');
    closeTimelineUsingToggle();
  });

  it('re-focuses the toggle button when timeline is closed by clicking the active timeline toggle button', () => {
    openTimelineUsingToggle();
    closeTimelineUsingToggle();

    cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
  });

  it('re-focuses the toggle button when timeline is closed by clicking the [X] close button', () => {
    openTimelineUsingToggle();
    closeTimelineUsingCloseButton();

    cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
  });

  it('re-focuses the toggle button when timeline is closed by pressing the Esc key', () => {
    openTimelineUsingToggle();
    cy.get('body').type('{esc}');

    cy.get(TIMELINE_BOTTOM_BAR_TOGGLE_BUTTON).should('have.focus');
  });

  it('the `(+)` button popover menu owns focus', () => {
    cy.get(TIMELINE_SETTINGS_ICON).filter(':visible').click({ force: true });
    cy.get(CREATE_NEW_TIMELINE).should('have.focus');
    cy.get('body').type('{esc}');
    cy.get(CREATE_NEW_TIMELINE).should('not.be.visible');
  });

  it('sets the data providers background to euiColorSuccess with a 10% alpha channel when the user starts dragging a host, but is not hovering over the data providers area', () => {
    dragFirstHostToTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS)
      .filter(':visible')
      .should(
        'have.css',
        'background',
        'rgba(1, 125, 115, 0.1) none repeat scroll 0% 0% / auto padding-box border-box'
      );
  });
});
