/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  closeFlyout,
  navigateToFlyoutTableTab,
  openBarchartPopoverMenu,
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
import { selectRange } from '../tasks/select_range';
import { login } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

describe('Indicators query bar interaction', { testIsolation: false }, () => {
  before(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
    cy.visit(THREAT_INTELLIGENCE);
    selectRange();
  });
  after(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  it('should add filter to kql and filter in values when clicking in the barchart legend', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openBarchartPopoverMenu();
    filterInFromBarChartLegend();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add negated filter to kql and filter out values when clicking in the barchart legend', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openBarchartPopoverMenu();
    filterOutFromBarChartLegend();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add filter to kql and filter in and out values when clicking in an indicators table cell', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterInFromTableCell();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add negated filter and filter out and out values when clicking in an indicators table cell', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    filterOutFromTableCell();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add filter to kql and filter in values when clicking in an indicators flyout overview tab block', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterInFromFlyoutBlockItem();
    closeFlyout();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add negated filter to kql filter out values when clicking in an indicators flyout overview block', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterOutFromFlyoutBlockItem();
    closeFlyout();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add filter to kql and filter in values when clicking in an indicators flyout overview tab table row', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterInFromFlyoutOverviewTable();
    closeFlyout();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add negated filter to kql filter out values when clicking in an indicators flyout overview tab row', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    filterOutFromFlyoutOverviewTable();
    closeFlyout();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add filter to kql and filter in values when clicking in an indicators flyout table tab action column', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    navigateToFlyoutTableTab();
    filterInFromFlyoutTableTab();
    closeFlyout();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });

  it('should add negated filter to kql filter out values when clicking in an indicators flyout table tab action column', () => {
    waitForViewToBeUpdated();
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    openFlyout(0);
    navigateToFlyoutTableTab();
    filterOutFromFlyoutTableTab();
    closeFlyout();

    cy.get(KQL_FILTER).should('exist');
    cy.get(INDICATOR_TYPE_CELL).its('length').should('be.gte', 0);

    clearKQLBar();
  });
});
