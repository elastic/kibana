/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import {
  TIMELINE_DROPPED_DATA_PROVIDERS,
  TIMELINE_DATA_PROVIDERS_ACTION_MENU,
  TIMELINE_FLYOUT_HEADER,
  GET_TIMELINE_GRID_CELL,
  TIMELINE_DATA_PROVIDERS_CONTAINER,
} from '../../../screens/timeline';

import { waitForAllHostsToBeLoaded } from '../../../tasks/hosts/all_hosts';

import { login, visit } from '../../../tasks/login';
import {
  addDataProvider,
  updateDataProviderbyDraggingField,
  addNameAndDescriptionToTimeline,
  populateTimeline,
  waitForTimelineChanges,
  createNewTimeline,
  updateDataProviderByFieldHoverAction,
} from '../../../tasks/timeline';
import { getTimeline } from '../../../objects/timeline';
import { HOSTS_URL } from '../../../urls/navigation';
import { cleanKibana, scrollToBottom } from '../../../tasks/common';

describe('timeline data providers', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    visit(HOSTS_URL);
    waitForAllHostsToBeLoaded();
    scrollToBottom();
    createNewTimeline();
    addNameAndDescriptionToTimeline(getTimeline());
    populateTimeline();
  });

  it('displays the data provider action menu when Enter is pressed', () => {
    addDataProvider({ field: 'host.name', operator: 'exists' });

    cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('not.exist');
    cy.get(`${TIMELINE_FLYOUT_HEADER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`).focus();
    cy.get(`${TIMELINE_FLYOUT_HEADER} ${TIMELINE_DROPPED_DATA_PROVIDERS}`)
      .first()
      .parent()
      .type('{enter}');

    cy.get(TIMELINE_DATA_PROVIDERS_ACTION_MENU).should('exist');
  });

  it('persists timeline when data provider is updated by dragging a field from data grid', () => {
    updateDataProviderbyDraggingField('host.name', 0);
    waitForTimelineChanges();
    cy.reload();
    cy.get(`${GET_TIMELINE_GRID_CELL('host.name')}`)
      .first()
      .then((hostname) => {
        cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).contains(`host.name: "${hostname.text()}"`);
      });
  });

  it('persists timeline when a field is added by hover action "Add To Timeline" in data provider ', () => {
    addDataProvider({ field: 'host.name', operator: 'exists' });
    waitForTimelineChanges();
    updateDataProviderByFieldHoverAction('host.name', 0);
    waitForTimelineChanges();
    cy.reload();
    cy.get(`${GET_TIMELINE_GRID_CELL('host.name')}`)
      .first()
      .then((hostname) => {
        cy.get(TIMELINE_DATA_PROVIDERS_CONTAINER).should((dataProviderContainer) => {
          expect(dataProviderContainer).to.contain(`host.name: "${hostname.text()}"`);
        });
      });
  });
});
