/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addToTimelineFromBarchartLegend,
  addToTimelineFromFlyoutOverviewTabBlock,
  addToTimelineFromFlyoutOverviewTabTable,
  addToTimelineFromTableCell,
  closeTimeline,
  investigateInTimelineFromFlyout,
  investigateInTimelineFromTable,
  openTimeline,
} from '../tasks/timeline';
import { closeFlyout, openFlyout, openFlyoutTakeAction } from '../tasks/common';
import {
  TIMELINE_AND_OR_BADGE,
  TIMELINE_DATA_PROVIDERS_WRAPPER,
  TIMELINE_DRAGGABLE_ITEM,
} from '../screens/timeline';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { login, visit } from '../tasks/login';

const THREAT_INTELLIGENCE = '/app/security/threat_intelligence/indicators';

describe('Timeline', { tags: '@ess' }, () => {
  beforeEach(() => {
    esArchiverLoad('threat_intelligence/indicators_data');
    login();
    visit(THREAT_INTELLIGENCE);
  });

  afterEach(() => {
    esArchiverUnload('threat_intelligence/indicators_data');
  });

  // TODO: This appears to already be failing on main.
  it.skip('should verify add to timeline and investigate in timeline work from various places', () => {
    cy.log('add to timeline when clicking in the barchart legend');

    addToTimelineFromBarchartLegend();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 3);
    });

    closeTimeline();

    cy.log('add to timeline when clicking in an indicator flyout overview tab table row');

    openFlyout(0);
    addToTimelineFromFlyoutOverviewTabTable();
    closeFlyout();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
    });

    closeTimeline();

    cy.log('add to timeline when clicking in an indicator flyout overview block');

    openFlyout(0);
    addToTimelineFromFlyoutOverviewTabBlock();
    closeFlyout();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
    });

    closeTimeline();

    cy.log('add to timeline when clicking in an indicator table cell');

    addToTimelineFromTableCell();
    openTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 9);
    });

    closeTimeline();

    cy.log('investigate in timeline when clicking in an indicator table action row');

    investigateInTimelineFromTable();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
    });

    closeTimeline();

    cy.log('investigate in timeline when clicking in an indicator flyout');

    openFlyout(0);
    openFlyoutTakeAction();
    investigateInTimelineFromFlyout();

    cy.get(TIMELINE_DATA_PROVIDERS_WRAPPER).within(() => {
      cy.get(TIMELINE_DRAGGABLE_ITEM).should('exist');
      cy.get(TIMELINE_AND_OR_BADGE).should('be.visible').and('have.length', 5);
    });
  });
});
