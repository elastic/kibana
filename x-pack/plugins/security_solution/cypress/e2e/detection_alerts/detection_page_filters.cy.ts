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
  CONTROL_FRAME_TITLE,
  FILTER_GROUP_CHANGED_BANNER,
  FILTER_GROUP_DISCARD_CHANGES,
  FILTER_GROUP_SAVE_CHANGES_POPOVER,
  OPTION_LIST_LABELS,
  OPTION_LIST_VALUES,
  OPTION_SELECTABLE,
} from '../../screens/common/filter_group';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '../../../common/constants';
import { formatPageFilterSearchParam } from '../../../common/utils/format_page_filter_search_param';
import {
  closePageFilterPopover,
  markAcknowledgedFirstAlert,
  openPageFilterPopover,
  resetFilters,
  selectCountTable,
  visitAlertsPageWithCustomFilters,
  waitForAlerts,
  waitForPageFilters,
} from '../../tasks/alerts';
import { ALERTS_COUNT } from '../../screens/alerts';
import { navigateFromHeaderTo } from '../../tasks/security_header';
import { ALERTS, CASES } from '../../screens/security_header';
import {
  addNewFilterGroupControlValues,
  deleteFilterGroupControl,
  discardFilterGroupControls,
  editFilterGroupControls,
  saveFilterGroupControls,
} from '../../tasks/common/filter_group';

const customFilters = [
  {
    fieldName: 'kibana.alert.workflow_status',
    title: 'Workflow Status',
  },
  {
    fieldName: 'kibana.alert.severity',
    title: 'Severity',
  },
  {
    fieldName: 'user.name',
    title: 'User Name',
  },
  {
    fieldName: 'process.name',
    title: 'ProcessName',
  },
  {
    fieldName: 'event.module',
    title: 'EventModule',
  },
  {
    fieldName: 'agent.type',
    title: 'AgentType',
  },
  {
    fieldName: 'kibana.alert.rule.name',
    title: 'Rule Name',
  },
];
const assertFilterControlsWithFilterObject = (filterObject = DEFAULT_DETECTION_PAGE_FILTERS) => {
  cy.get(CONTROL_FRAMES).should((sub) => {
    expect(sub.length).eq(filterObject.length);
  });

  cy.get(OPTION_LIST_LABELS).should((sub) => {
    filterObject.forEach((filter, idx) => {
      expect(sub.eq(idx).text()).eq(filter.title);
    });
  });

  filterObject.forEach((filter, idx) => {
    cy.get(OPTION_LIST_VALUES(idx)).should((sub) => {
      expect(sub.text().replace(',', '')).satisfy((txt: string) => {
        return txt.startsWith(
          filter.selectedOptions && filter.selectedOptions.length > 0
            ? filter.selectedOptions.join('')
            : ''
        );
      });
    });
  });
};

describe('Detections : Page Filters', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    login();
    createRule({ ...getNewRule(), rule_id: 'custom_rule_filters' });
    visit(ALERTS_URL);
    waitForAlerts();
    waitForPageFilters();
  });

  afterEach(() => {
    resetFilters();
  });

  it('Default page filters are populated when nothing is provided in the URL', () => {
    assertFilterControlsWithFilterObject();
  });

  context('Alert Page Filters Customization ', { testIsolation: false }, () => {
    it('Add New Controls', () => {
      const fieldName = 'event.module';
      const label = 'EventModule';
      editFilterGroupControls();
      addNewFilterGroupControlValues({
        fieldName,
        label,
      });
      cy.get(CONTROL_FRAME_TITLE).should('contain.text', label);
      cy.get(FILTER_GROUP_SAVE_CHANGES_POPOVER).should('be.visible');
      cy.get(FILTER_GROUP_DISCARD_CHANGES).click();
      cy.get(CONTROL_FRAME_TITLE).should('not.contain.text', label);
    });
    it('Delete Controls', () => {
      waitForPageFilters();
      editFilterGroupControls();
      deleteFilterGroupControl(3);
      cy.get(CONTROL_FRAMES).should((sub) => {
        expect(sub.length).lt(4);
      });
      cy.get(FILTER_GROUP_DISCARD_CHANGES).trigger('click', { force: true });
    });
    it('should not sync to the URL in edit mode but only in view mode', () => {
      cy.url().then((urlString) => {
        editFilterGroupControls();
        addNewFilterGroupControlValues({ fieldName: 'event.module', label: 'Event Module' });
        cy.url().should('eq', urlString);
        saveFilterGroupControls();
        cy.url().should('not.eq', urlString);
      });
    });
    it('should not sync to the localstorage', () => {});
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

    cy.get(FILTER_GROUP_SAVE_CHANGES_POPOVER).should('be.visible');
  });

  it(`Alert list is updated when the alerts are updated`, () => {
    // mark status of one alert to be acknowledged
    cy.visit(ALERTS_URL);
    selectCountTable();
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((noOfAlerts) => {
        const originalAlertCount = noOfAlerts.split(' ')[0];
        markAcknowledgedFirstAlert();
        waitForAlerts();
        cy.get(OPTION_LIST_VALUES(0)).click();
        cy.get(OPTION_SELECTABLE(0, 'acknowledged')).should('be.visible');
        cy.get(ALERTS_COUNT)
          .invoke('text')
          .should((newAlertCount) => {
            expect(newAlertCount.split(' ')[0]).eq(String(parseInt(originalAlertCount, 10) - 1));
          });
      });
  });

  it(`URL is updated when filters are updated`, () => {
    cy.visit(ALERTS_URL);

    cy.on('url:changed', (urlString) => {
      const NEW_FILTERS = DEFAULT_DETECTION_PAGE_FILTERS.map((filter) => {
        if (filter.title === 'Severity') {
          filter.selectedOptions = ['high'];
        }
        return filter;
      });
      const expectedVal = encode(formatPageFilterSearchParam(NEW_FILTERS));
      expect(urlString).to.contain.text(expectedVal);
    });

    openPageFilterPopover(1);
    cy.get(OPTION_SELECTABLE(1, 'high')).should('be.visible');
    cy.get(OPTION_SELECTABLE(1, 'high')).click({ force: true });
    closePageFilterPopover(1);
  });

  it(`Filters are restored from localstorage when user navigates back to the page.`, () => {
    // change severity filter to high
    cy.visit(ALERTS_URL);
    cy.get(OPTION_LIST_VALUES(1)).click();
    cy.get(OPTION_SELECTABLE(1, 'high')).should('be.visible');
    cy.get(OPTION_SELECTABLE(1, 'high')).click({ force: true });

    // high should be scuccessfully selected.
    cy.get(OPTION_LIST_VALUES(1)).contains('high');
    waitForPageFilters();

    navigateFromHeaderTo(CASES); // navigate away from alert page

    navigateFromHeaderTo(ALERTS); // navigate back to alert page

    waitForPageFilters();

    cy.get(OPTION_LIST_VALUES(0)).contains('open'); // status should be Open as previously selected
    cy.get(OPTION_LIST_VALUES(1)).contains('high'); // severity should be low as previously selected
  });

  it('Custom filters from URLS are populated & changed banner is displayed', () => {
    visitAlertsPageWithCustomFilters(customFilters);

    assertFilterControlsWithFilterObject(customFilters);

    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
  });

  it('Changed banner should hide on saving changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);

    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    saveFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });
  it('Changed banner should hide on discarding changes', () => {
    visitAlertsPageWithCustomFilters(customFilters);

    cy.get(FILTER_GROUP_CHANGED_BANNER).should('be.visible');
    discardFilterGroupControls();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });

  it('Changed banner should hide on Reset', () => {
    visitAlertsPageWithCustomFilters(customFilters);
    resetFilters();
    cy.get(FILTER_GROUP_CHANGED_BANNER).should('not.exist');
  });
});
