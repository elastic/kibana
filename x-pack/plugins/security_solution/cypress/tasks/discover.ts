/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DISCOVER_ADD_FILTER,
  DISCOVER_CONTAINER,
  DISCOVER_DATA_GRID_UPDATING,
  DISCOVER_DATA_VIEW_SWITCHER,
  DISCOVER_QUERY_INPUT,
} from '../screens/discover';
import { GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON } from '../screens/search_bar';

export const switchDataViewTo = (dataviewName: string) => {
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).click();
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.INPUT).should('be.visible');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.GET_DATA_VIEW(dataviewName)).trigger('click');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.INPUT).should('not.be.visible');
  cy.get(DISCOVER_DATA_VIEW_SWITCHER.BTN).should('contain.text', dataviewName);
};

export const waitForDiscoverGridToLoad = () => {
  cy.get(DISCOVER_DATA_GRID_UPDATING).should('be.visible');
  cy.get(DISCOVER_DATA_GRID_UPDATING).should('not.exist');
};

export const addDiscoverKqlQuery = (kqlQuery: string) => {
  cy.get(DISCOVER_QUERY_INPUT).type(kqlQuery);
};

export const submitDiscoverSearchBar = () => {
  cy.get(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER)).trigger('click');
};

export const openAddDiscoverFilterPopover = () => {
  cy.log(DISCOVER_CONTAINER);
  cy.log(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER));
  cy.get(GET_LOCAL_SEARCH_BAR_SUBMIT_BUTTON(DISCOVER_CONTAINER)).should('be.enabled');
  cy.get(DISCOVER_ADD_FILTER).should('be.visible');
  cy.get(DISCOVER_ADD_FILTER).click();
};
