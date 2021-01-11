/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TIMELINE_DATA_PROVIDERS,
  TIMELINE_DATA_PROVIDERS_EMPTY,
  TIMELINE_DROPPED_DATA_PROVIDERS,
} from '../screens/timeline';
import { HOSTS_NAMES_DRAGGABLE } from '../screens/hosts/all_hosts';

import {
  dragAndDropFirstHostToTimeline,
  dragFirstHostToEmptyTimelineDataProviders,
  dragFirstHostToTimeline,
  waitForAllHostsToBeLoaded,
} from '../tasks/hosts/all_hosts';

import { loginAndWaitForPage } from '../tasks/login';
import { openTimelineUsingToggle } from '../tasks/security_main';
import { closeTimeline, createNewTimeline } from '../tasks/timeline';

import { HOSTS_URL } from '../urls/navigation';
import { cleanKibana } from '../tasks/common';

describe('timeline data providers', () => {
  before(() => {
    cleanKibana();
    loginAndWaitForPage(HOSTS_URL);
    waitForAllHostsToBeLoaded();
  });

  afterEach(() => {
    createNewTimeline();
    closeTimeline();
  });

  it('renders the data provider of a host dragged from the All Hosts widget on the hosts page', () => {
    dragAndDropFirstHostToTimeline();
    openTimelineUsingToggle();
    cy.get(TIMELINE_DROPPED_DATA_PROVIDERS)
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

  it('sets the background to euiColorSuccess with a 10% alpha channel when the user starts dragging a host, but is not hovering over the data providers', () => {
    dragFirstHostToTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS)
      .filter(':visible')
      .should(
        'have.css',
        'background',
        'rgba(1, 125, 115, 0.1) none repeat scroll 0% 0% / auto padding-box border-box'
      );
  });

  it('sets the background to euiColorSuccess with a 20% alpha channel and renders the dashed border color as euiColorSuccess when the user starts dragging a host AND is hovering over the data providers', () => {
    dragFirstHostToEmptyTimelineDataProviders();

    cy.get(TIMELINE_DATA_PROVIDERS_EMPTY)
      .filter(':visible')
      .should(
        'have.css',
        'background',
        'rgba(1, 125, 115, 0.2) none repeat scroll 0% 0% / auto padding-box border-box'
      );

    cy.get(TIMELINE_DATA_PROVIDERS)
      .filter(':visible')
      .should('have.css', 'border', '3.1875px dashed rgb(1, 125, 115)');
  });
});
