/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { getNewRule } from '../../objects/rule';
import {
  CONTROL_FRAMES,
  OPTION_LIST_LABELS,
  OPTION_LIST_VALUES,
  OPTION_SELECTABLE,
} from '../../screens/common/filter_group';
import { createCustomRuleEnabled } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { APP_ID, DEFAULT_DETECTION_PAGE_FILTERS } from '../../../common/constants';
import { formatPageFilterSearchParam } from '../../../common/utils/format_page_filter_search_param';
import {
  markAcknowledgedFirstAlert,
  resetFilters,
  selectCountTable,
  waitForAlerts,
  waitForPageFilters,
} from '../../tasks/alerts';
import { ALERTS_COUNT } from '../../screens/alerts';
import { navigateFromHeaderTo } from '../../tasks/security_header';
import { ALERTS, CASES } from '../../screens/security_header';

const assertFilterControlsWithFilterObject = (filterObject = DEFAULT_DETECTION_PAGE_FILTERS) => {
  cy.log(JSON.stringify({ filterObject }));

  cy.get(CONTROL_FRAMES).should((sub) => {
    expect(sub.length).eq(4);
  });

  cy.get(OPTION_LIST_LABELS).should((sub) => {
    filterObject.forEach((filter, idx) => {
      expect(sub.eq(idx).text()).eq(filter.title);
    });
  });

  cy.get(OPTION_LIST_VALUES).should((sub) => {
    filterObject.forEach((filter, idx) => {
      expect(sub.eq(idx).text().replace(',', '')).eq(
        filter.selectedOptions && filter.selectedOptions.length > 0
          ? filter.selectedOptions.join('')
          : 'Any'
      );
    });
  });
};

describe('Detections : Page Filters', () => {
  before(() => {
    cleanKibana();
    login();
    createCustomRuleEnabled(getNewRule(), 'custom_rule_filters');
  });

  beforeEach(() => {
    login();
    visit(ALERTS_URL);
    waitForAlerts();
    waitForPageFilters();
  });

  afterEach(() => {
    cy.clearLocalStorage(`${APP_ID}.pageFilters`);
    resetFilters();
  });

  it('Default page filters are populated when nothing is provided in the URL', () => {
    assertFilterControlsWithFilterObject();
  });

  it('Page filters are loaded with custom values provided in the URL', () => {
    const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
      if (filter.title === 'Status') {
        filter.selectedOptions = ['open', 'acknowledged'];
      }
      return filter;
    });

    cy.url().then((url) => {
      const currURL = new URL(url);

      currURL.searchParams.set('pageFilters', encode(formatPageFilterSearchParam(NEW_FILTERS)));
      cy.visit(currURL.toString());
      waitForAlerts();
      assertFilterControlsWithFilterObject(NEW_FILTERS);
    });
  });

  it('Page filters are loaded with custom filters and values', () => {
    const CUSTOM_URL_FILTER = [
      {
        title: 'Process',
        fieldName: 'process.name',
        selectedOptions: ['testing123'],
      },
    ];

    const pageFilterUrlString = formatPageFilterSearchParam(CUSTOM_URL_FILTER);

    cy.url().then((url) => {
      const currURL = new URL(url);

      currURL.searchParams.set('pageFilters', encode(pageFilterUrlString));
      cy.visit(currURL.toString());

      waitForAlerts();
      cy.get(OPTION_LIST_LABELS).should((sub) => {
        DEFAULT_DETECTION_PAGE_FILTERS.forEach((filter, idx) => {
          if (idx === DEFAULT_DETECTION_PAGE_FILTERS.length - 1) {
            expect(sub.eq(idx).text()).eq(CUSTOM_URL_FILTER[0].title);
          } else {
            expect(sub.eq(idx).text()).eq(filter.title);
          }
        });
      });
    });
  });

  it('URL is updated when ever page filters are loaded', (done) => {
    cy.on('url:changed', () => {
      const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
        if (filter.title === 'Status') {
          filter.selectedOptions = [];
        }
        return filter;
      });
      cy.url().should('have.text', formatPageFilterSearchParam(NEW_FILTERS));
      done();
    });
    cy.get(OPTION_LIST_VALUES).eq(0).click();

    // unselect status open
    cy.get(OPTION_SELECTABLE(0, 'open')).trigger('click', { force: true });
  });

  it(`Alert list is updated when the alerts are updated`, () => {
    // mark status of one alert to be acknowledged
    selectCountTable();
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((noOfAlerts) => {
        const originalAlertCount = noOfAlerts.split(' ')[0];
        markAcknowledgedFirstAlert();
        cy.reload();
        waitForAlerts();
        cy.get(OPTION_LIST_VALUES).eq(0).click();
        cy.get(OPTION_SELECTABLE(0, 'acknowledged')).should('be.visible');
        cy.get(ALERTS_COUNT)
          .invoke('text')
          .should((newAlertCount) => {
            expect(newAlertCount.split(' ')[0]).eq(String(parseInt(originalAlertCount, 10) - 1));
          });
      });
  });

  it(`URL is updated when filters are updated`, (done) => {
    const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
      if (filter.title === 'Severity') {
        filter.selectedOptions = ['high'];
      }
      return filter;
    });

    cy.on('url:changed', () => {
      // we want assertion to run only once URL Changes.
      cy.url().should('have.text', formatPageFilterSearchParam(NEW_FILTERS));
      done();
    });
    cy.get(OPTION_LIST_VALUES).eq(1).click();
    cy.get(OPTION_SELECTABLE(1, 'high')).should('be.visible');
    cy.get(OPTION_SELECTABLE(1, 'high')).click({ force: true });
  });

  it(`Filters are restored from localstorage when user navigates back to the page.`, () => {
    // change severity filter to high
    cy.get(OPTION_LIST_VALUES).eq(1).click();
    cy.get(OPTION_SELECTABLE(1, 'high')).should('be.visible');
    cy.get(OPTION_SELECTABLE(1, 'high')).click({ force: true });

    // high should be scuccessfully selected.
    cy.get(OPTION_LIST_VALUES).eq(1).contains('high');

    navigateFromHeaderTo(CASES); // navigate away from alert page

    navigateFromHeaderTo(ALERTS); // navigate back to alert page

    waitForPageFilters();

    cy.get(OPTION_LIST_VALUES).eq(0).contains('open'); // status should be Open as previously selected
    cy.get(OPTION_LIST_VALUES).eq(1).contains('high'); // severity should be low as previously selected
  });
});
