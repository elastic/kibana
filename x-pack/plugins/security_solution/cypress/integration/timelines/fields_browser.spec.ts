/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FIELDS_BROWSER_CATEGORIES_COUNT,
  FIELDS_BROWSER_FIELDS_COUNT,
  FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER,
  FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER,
  FIELDS_BROWSER_MESSAGE_HEADER,
  FIELDS_BROWSER_FILTER_INPUT,
  FIELDS_BROWSER_CATEGORIES_FILTER_CONTAINER,
  FIELDS_BROWSER_SELECTED_CATEGORIES_BADGES,
  FIELDS_BROWSER_CATEGORY_BADGE,
} from '../../screens/fields_browser';
import { TIMELINE_FIELDS_BUTTON } from '../../screens/timeline';
import { cleanKibana } from '../../tasks/common';

import {
  addsHostGeoCityNameToTimeline,
  addsHostGeoContinentNameToTimeline,
  clearFieldsBrowser,
  closeFieldsBrowser,
  filterFieldsBrowser,
  toggleCategoryFilter,
  removesMessageField,
  resetFields,
  toggleCategory,
} from '../../tasks/fields_browser';
import { loginAndWaitForPage } from '../../tasks/login';
import { openTimelineUsingToggle } from '../../tasks/security_main';
import { openTimelineFieldsBrowser, populateTimeline } from '../../tasks/timeline';

import { HOSTS_URL } from '../../urls/navigation';

const defaultHeaders = [
  { id: '@timestamp' },
  { id: 'message' },
  { id: 'event.category' },
  { id: 'event.action' },
  { id: 'host.name' },
  { id: 'source.ip' },
  { id: 'destination.ip' },
  { id: 'user.name' },
];

describe('Fields Browser', () => {
  context('Fields Browser rendering', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
      openTimelineUsingToggle();
      populateTimeline();
      openTimelineFieldsBrowser();
    });

    afterEach(() => {
      clearFieldsBrowser();
    });

    it('displays all categories (by default)', () => {
      cy.get(FIELDS_BROWSER_SELECTED_CATEGORIES_BADGES).should('be.empty');
    });

    it('displays the expected count of categories that match the filter input', () => {
      const filterInput = 'host.mac';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_CATEGORIES_COUNT).should('have.text', '2');
    });

    it('displays a search results label with the expected count of fields matching the filter input', () => {
      const filterInput = 'host.mac';
      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_FIELDS_COUNT).should('contain.text', '2');
    });

    it('the `default ECS` category matches the default timeline header fields', () => {
      const category = 'default ECS';
      toggleCategory(category);
      cy.get(FIELDS_BROWSER_FIELDS_COUNT).should('contain.text', `${defaultHeaders.length}`);

      defaultHeaders.forEach((header) => {
        cy.get(`[data-test-subj="field-${header.id}-checkbox"]`).should('be.checked');
      });
      toggleCategory(category);
    });

    it('creates the category badge when it is selected', () => {
      const category = 'host';

      cy.get(FIELDS_BROWSER_CATEGORY_BADGE(category)).should('not.exist');
      toggleCategory(category);
      cy.get(FIELDS_BROWSER_CATEGORY_BADGE(category)).should('exist');
      toggleCategory(category);
    });

    it('search a category should match the category in the category filter', () => {
      const category = 'host';

      filterFieldsBrowser(category);
      toggleCategoryFilter();
      cy.get(FIELDS_BROWSER_CATEGORIES_FILTER_CONTAINER).should('contain.text', category);
    });

    it('search a category should filter out non matching categories in the category filter', () => {
      const category = 'host';
      const categoryCheck = 'event';
      filterFieldsBrowser(category);
      toggleCategoryFilter();
      cy.get(FIELDS_BROWSER_CATEGORIES_FILTER_CONTAINER).should('not.contain.text', categoryCheck);
    });
  });

  context('Editing the timeline', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
      openTimelineUsingToggle();
      populateTimeline();
      openTimelineFieldsBrowser();
    });

    afterEach(() => {
      openTimelineFieldsBrowser();
      clearFieldsBrowser();
    });

    it('removes the message field from the timeline when the user un-checks the field', () => {
      cy.get(FIELDS_BROWSER_MESSAGE_HEADER).should('exist');

      removesMessageField();
      closeFieldsBrowser();

      cy.get(FIELDS_BROWSER_MESSAGE_HEADER).should('not.exist');
    });

    it('adds a field to the timeline when the user clicks the checkbox', () => {
      const filterInput = 'host.geo.c';

      closeFieldsBrowser();
      cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER).should('not.exist');

      openTimelineFieldsBrowser();

      filterFieldsBrowser(filterInput);
      addsHostGeoCityNameToTimeline();
      closeFieldsBrowser();

      cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER).should('exist');
    });

    it('resets all fields in the timeline when `Reset Fields` is clicked', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('not.exist');

      addsHostGeoContinentNameToTimeline();
      closeFieldsBrowser();

      cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('exist');

      openTimelineFieldsBrowser();
      resetFields();

      cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('not.exist');
    });

    it('restores focus to the Customize Columns button when `Reset Fields` is clicked', () => {
      openTimelineFieldsBrowser();
      resetFields();

      cy.get(TIMELINE_FIELDS_BUTTON).should('have.focus');
    });

    it('restores focus to the Customize Columns button when Esc is pressed', () => {
      openTimelineFieldsBrowser();
      cy.get(FIELDS_BROWSER_FILTER_INPUT).type('{esc}');

      cy.get(TIMELINE_FIELDS_BUTTON).should('have.focus');
    });
  });
});
