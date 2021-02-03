/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FIELDS_BROWSER_CHECKBOX,
  FIELDS_BROWSER_CONTAINER,
  FIELDS_BROWSER_SELECTED_CATEGORY_TITLE,
} from '../../screens/fields_browser';
import {
  HEADER_SUBTITLE,
  HOST_GEO_CITY_NAME_HEADER,
  HOST_GEO_COUNTRY_NAME_HEADER,
  INSPECT_MODAL,
} from '../../screens/hosts/events';
import { HEADERS_GROUP } from '../../screens/timeline';

import { closeFieldsBrowser, filterFieldsBrowser } from '../../tasks/fields_browser';
import { loginAndWaitForPage } from '../../tasks/login';
import { openEvents } from '../../tasks/hosts/main';
import {
  addsHostGeoCityNameToHeader,
  addsHostGeoCountryNameToHeader,
  dragAndDropColumn,
  openEventsViewerFieldsBrowser,
  opensInspectQueryModal,
  waitsForEventsToBeLoaded,
} from '../../tasks/hosts/events';
import { clearSearchBar, kqlSearch } from '../../tasks/security_header';

import { HOSTS_URL } from '../../urls/navigation';
import { resetFields } from '../../tasks/timeline';
import { cleanKibana } from '../../tasks/common';

const defaultHeadersInDefaultEcsCategory = [
  { id: '@timestamp' },
  { id: 'message' },
  { id: 'host.name' },
  { id: 'event.action' },
  { id: 'user.name' },
  { id: 'source.ip' },
  { id: 'destination.ip' },
];

describe('Events Viewer', () => {
  context('Fields rendering', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
      openEvents();
    });

    beforeEach(() => {
      openEventsViewerFieldsBrowser();
    });

    afterEach(() => {
      closeFieldsBrowser();
      cy.get(FIELDS_BROWSER_CONTAINER).should('not.exist');
    });

    it('displays the `default ECS` category (by default)', () => {
      cy.get(FIELDS_BROWSER_SELECTED_CATEGORY_TITLE).should('have.text', 'default ECS');
    });

    it('displays a checked checkbox for all of the default events viewer columns that are also in the default ECS category', () => {
      defaultHeadersInDefaultEcsCategory.forEach((header) =>
        cy.get(FIELDS_BROWSER_CHECKBOX(header.id)).should('be.checked')
      );
    });
  });

  context('Events viewer query modal', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
      openEvents();
    });

    it('launches the inspect query modal when the inspect button is clicked', () => {
      waitsForEventsToBeLoaded();
      opensInspectQueryModal();
      cy.get(INSPECT_MODAL).should('exist');
    });
  });

  context('Events viewer fields behaviour', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
      openEvents();
    });

    beforeEach(() => {
      openEventsViewerFieldsBrowser();
    });

    it('adds a field to the events viewer when the user clicks the checkbox', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);
      cy.get(HOST_GEO_CITY_NAME_HEADER).should('not.exist');
      addsHostGeoCityNameToHeader();
      closeFieldsBrowser();
      cy.get(HOST_GEO_CITY_NAME_HEADER).should('exist');
    });

    it('resets all fields in the events viewer when `Reset Fields` is clicked', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);
      cy.get(HOST_GEO_COUNTRY_NAME_HEADER).should('not.exist');
      addsHostGeoCountryNameToHeader();
      resetFields();
      cy.get(HOST_GEO_COUNTRY_NAME_HEADER).should('not.exist');
    });
  });

  context('Events behavior', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
      openEvents();
      waitsForEventsToBeLoaded();
    });

    afterEach(() => {
      clearSearchBar();
    });

    it('filters the events by applying filter criteria from the search bar at the top of the page', () => {
      const filterInput = 'aa7ca589f1b8220002f2fc61c64cfbf1'; // this will never match real data
      cy.get(HEADER_SUBTITLE)
        .invoke('text')
        .then((initialNumberOfEvents) => {
          kqlSearch(`${filterInput}{enter}`);
          cy.get(HEADER_SUBTITLE).should('not.have.text', initialNumberOfEvents);
        });
    });
  });

  context('Events columns', () => {
    before(() => {
      cleanKibana();
      loginAndWaitForPage(HOSTS_URL);
      openEvents();
      cy.scrollTo('bottom');
      waitsForEventsToBeLoaded();
    });

    afterEach(() => {
      openEventsViewerFieldsBrowser();
      resetFields();
    });

    it('re-orders columns via drag and drop', () => {
      const originalColumnOrder =
        '@timestamp1messagehost.nameevent.moduleevent.datasetevent.actionuser.namesource.ipdestination.ip';
      const expectedOrderAfterDragAndDrop =
        'message@timestamp1host.nameevent.moduleevent.datasetevent.actionuser.namesource.ipdestination.ip';

      cy.get(HEADERS_GROUP).should('have.text', originalColumnOrder);
      dragAndDropColumn({ column: 0, newPosition: 0 });
      cy.get(HEADERS_GROUP).should('have.text', expectedOrderAfterDragAndDrop);
    });
  });
});
