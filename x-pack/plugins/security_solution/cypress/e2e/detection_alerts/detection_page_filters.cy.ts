/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { ALERTS_URL, DASHBOARDS_URL } from '../../urls/navigation';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '../../../common/constants';
import { formatPageFilterSearchParam } from '../../../common/utils/format_page_filter_search_param';
import { markAcknowledgedFirstAlert, selectCountTable, waitForAlerts } from '../../tasks/alerts';
import { ALERTS_COUNT } from '../../screens/alerts';

const assertFilterControlsWithFilterObject = (filterObject = DEFAULT_DETECTION_PAGE_FILTERS) => {
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
    visit(ALERTS_URL);
    waitForAlerts();
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

      currURL.searchParams.set('pageFilters', formatPageFilterSearchParam(NEW_FILTERS));
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

      currURL.searchParams.set('pageFilters', pageFilterUrlString);
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

  it('URL is updated when ever page filters are loaded', () => {
    cy.visit(DASHBOARDS_URL);

    // to rest the URL params from last test
    cy.visit(ALERTS_URL);

    waitForAlerts();

    cy.get(OPTION_LIST_VALUES).eq(0).click();

    // unselect status open
    cy.get(OPTION_SELECTABLE(0, 'open')).trigger('click', { force: true });

    cy.url().should((url) => {
      const currURL = new URL(url);

      const pageFilterString = currURL.searchParams.get('pageFilters');
      const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
        if (filter.title === 'Status') {
          filter.selectedOptions = [];
        }
        return filter;
      });

      expect(pageFilterString).eq(formatPageFilterSearchParam(NEW_FILTERS));
    });
  });

  it(`Filters are updated when the alerts are updated`, () => {
    // mark status of one alert to be acknowledged
    selectCountTable();
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((noOfAlerts) => {
        expect(noOfAlerts.split(' ')[0]).eq('2');
        markAcknowledgedFirstAlert();
      });

    cy.reload();
    waitForAlerts();
    cy.get(OPTION_LIST_VALUES).eq(0).click();
    cy.get(OPTION_SELECTABLE(0, 'acknowledged')).should('be.visible');
    selectCountTable();
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .should((noOfAlerts) => {
        expect(noOfAlerts.split(' ')[0]).eq('1');
      });
  });
});
