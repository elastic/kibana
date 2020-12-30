/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { drag, drop } from '../common';
import {
  CLOSE_MODAL,
  EVENTS_VIEWER_FIELDS_BUTTON,
  EVENTS_VIEWER_PAGINATION,
  FIELDS_BROWSER_CONTAINER,
  HOST_GEO_CITY_NAME_CHECKBOX,
  HOST_GEO_COUNTRY_NAME_CHECKBOX,
  INSPECT_QUERY,
  LOAD_MORE,
  SERVER_SIDE_EVENT_COUNT,
} from '../../screens/hosts/events';
import { DRAGGABLE_HEADER } from '../../screens/timeline';
import { REFRESH_BUTTON } from '../../screens/security_header';

export const addsHostGeoCityNameToHeader = () => {
  cy.get(HOST_GEO_CITY_NAME_CHECKBOX).check({
    force: true,
  });
};

export const addsHostGeoCountryNameToHeader = () => {
  cy.get(HOST_GEO_COUNTRY_NAME_CHECKBOX).check({
    force: true,
  });
};

export const closeModal = () => {
  cy.get(CLOSE_MODAL).click();
};

export const loadMoreEvents = () => {
  cy.get(LOAD_MORE).click({ force: true });
};

export const openEventsViewerFieldsBrowser = () => {
  cy.get(EVENTS_VIEWER_FIELDS_BUTTON).click({ force: true });

  cy.get(SERVER_SIDE_EVENT_COUNT).should('not.have.text', '0');

  cy.get(FIELDS_BROWSER_CONTAINER).should('exist');
};

export const opensInspectQueryModal = () => {
  cy.get(INSPECT_QUERY)
    .should('exist')
    .trigger('mousemove', { force: true })
    .click({ force: true });
};

export const waitsForEventsToBeLoaded = () => {
  cy.get(SERVER_SIDE_EVENT_COUNT).should('not.have.text', '0');
  cy.get(REFRESH_BUTTON).should('not.have.text', 'Updating');
  cy.get(EVENTS_VIEWER_PAGINATION).should('exist');
};

export const dragAndDropColumn = ({
  column,
  newPosition,
}: {
  column: number;
  newPosition: number;
}) => {
  cy.get(DRAGGABLE_HEADER).first().should('exist');
  cy.get(DRAGGABLE_HEADER)
    .eq(column)
    .then((header) => drag(header));

  cy.get(DRAGGABLE_HEADER)
    .eq(newPosition)
    .then((targetPosition) => {
      drop(targetPosition);
    });
};
