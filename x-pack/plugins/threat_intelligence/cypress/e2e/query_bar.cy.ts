/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  closeFlyout,
  navigateToFlyoutTableTab,
  openFlyout,
  waitForViewToBeUpdated,
} from '../tasks/common';
import {
  clearKQLBar,
  filterInFromBarChartLegend,
  filterInFromFlyoutBlockItem,
  filterInFromFlyoutOverviewTable,
  filterInFromFlyoutTableTab,
  filterInFromTableCell,
  filterOutFromBarChartLegend,
  filterOutFromFlyoutBlockItem,
  filterOutFromFlyoutOverviewTable,
  filterOutFromFlyoutTableTab,
  filterOutFromTableCell,
} from '../tasks/query_bar';
import { INDICATOR_TYPE_CELL } from '../screens/indicators';
import { KQL_FILTER } from '../screens/query_bar';
import { login, visit } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

describe('Indicators query bar interaction', { tags: '@ess' }, () => {
  beforeEach(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
    visit(THREAT_INTELLIGENCE);
  });

  afterEach(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  it.skip('should add filter to kql', () => {
    cy.log('filter in values when clicking in the barchart legend');

    waitForViewToBeUpdated();

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterInFromBarChartLegend();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in the barchart legend');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterOutFromBarChartLegend();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators table cell');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterInFromTableCell();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out and out values when clicking in an indicators table cell');

    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterOutFromTableCell();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators flyout overview tab block');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterInFromFlyoutBlockItem();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in an indicators flyout overview block');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterOutFromFlyoutBlockItem();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators flyout overview tab table row');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterInFromFlyoutOverviewTable();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in an indicators flyout overview tab row');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterOutFromFlyoutOverviewTable();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter in values when clicking in an indicators flyout table tab action column');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    navigateToFlyoutTableTab();
    filterInFromFlyoutTableTab();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
    waitForViewToBeUpdated();

    cy.log('filter out values when clicking in an indicators flyout table tab action column');

    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    navigateToFlyoutTableTab();
    filterOutFromFlyoutTableTab();
    closeFlyout();
    waitForViewToBeUpdated();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });
});
