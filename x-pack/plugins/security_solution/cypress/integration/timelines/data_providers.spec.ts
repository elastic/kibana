/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TIMELINE_DATA_PROVIDERS,
  TIMELINE_DATA_PROVIDERS_EMPTY,
  TIMELINE_DROPPED_DATA_PROVIDERS,
  TIMELINE_DATA_PROVIDERS_ACTION_MENU,
  IS_DRAGGING_DATA_PROVIDERS,
  TIMELINE_FLYOUT_HEADER,
  TIMELINE_DROPPED_DATA_CONTAINER,
} from '../../screens/timeline';
import { HOSTS_NAMES_DRAGGABLE } from '../../screens/hosts/all_hosts';

import {
  dragAndDropFirstHostToTimeline,
  dragFirstHostToEmptyTimelineDataProviders,
  unDragFirstHostToEmptyTimelineDataProviders,
  dragFirstHostToTimeline,
  waitForAllHostsToBeLoaded,
} from '../../tasks/hosts/all_hosts';

import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { addDataProvider, closeTimeline, createNewTimeline } from '../../tasks/timeline';

import { HOSTS_URL } from '../../urls/navigation';
import { cleanKibana, scrollToBottom } from '../../tasks/common';

describe('timeline data providers', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
    waitForAllHostsToBeLoaded();
    scrollToBottom();
  });

  afterEach(() => {
    createNewTimeline();
    closeTimeline();
  });

  it('renders the data provider of a host dragged from the All Hosts widget on the hosts page', () => {
    dragAndDropFirstHostToTimeline();
    openTimelineUsingToggle();
    cy.get(`${TIMELINE_DROPPED_DATA_CONTAINER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`)
      .first()
      .invoke('text')
      .then((dataProviderText) => {
        cy.get(HOSTS_NAMES_DRAGGABLE)
          .first()
          .invoke('text')
          .should((hostname) => {
            expect(dataProviderText).to.eq(`host.name: "${hostname}"AND`);
          });
      });
  });

  it('displays the data provider action menu when Enter is pressed', (done) => {
    openTimelineUsingToggle();
    addDataProvider({ field: 'host.name', operator: 'exists' }).then(() => {
      cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('not.exist');

      cy.get(`${TIMELINE_FLYOUT_HEADER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`)
        .pipe(($el) => $el.trigger('focus'))
        .should('exist');
      cy.get(`${TIMELINE_FLYOUT_HEADER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`)
        .first()
        .parent()
        .type('{enter}');

      cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('exist');
      done();
    });
  });

  it('sets correct classes when the user starts dragging a host, but is not hovering over the data providers', () => {
    dragFirstHostToTimeline();

    cy.get(IS_DRAGGING_DATA_PROVIDERS)
      .find(TIMELINE_DATA_PROVIDERS)
      .filter(':visible')
      .should('have.class', 'drop-target-data-providers');
  });

  it('render an extra highlighted area in dataProvider when the user starts dragging a host AND is hovering over the data providers', () => {
    dragFirstHostToEmptyTimelineDataProviders();

    cy.get(IS_DRAGGING_DATA_PROVIDERS)
      .find(TIMELINE_DATA_PROVIDERS_EMPTY)
      .children()
      .should('exist');

    // Release the dragging item so the cursor can peform other action
    unDragFirstHostToEmptyTimelineDataProviders();
  });
});
