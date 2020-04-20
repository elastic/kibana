/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

import { goToCreateNewCase } from '../tasks/all_cases';
import { createNewCase } from '../tasks/create_new_case';
import { case1 } from '../objects/case';
import { CASES } from '../urls/navigation';

describe('Cases', () => {
  before(() => {
    esArchiverLoad('timeline');
  });

  after(() => {
    esArchiverUnload('timeline');
  });

  it('Creates a new case with timeline and opens the timeline', () => {
    loginAndWaitForPageWithoutDateRange(CASES);
    goToCreateNewCase();
    createNewCase(case1);

    /*
    cy.get(
      '[data-test-subj="caseTitle"] [data-test-subj="input"]'
    ).type('This is the title of the case', { force: true });
    cy.get(
      '[data-test-subj="caseTags"] [data-test-subj="comboBoxSearchInput"]'
    ).type('Tag1{enter}Tag2{enter}', { force: true });
    cy.get(
      '[data-test-subj="caseDescription"] [data-test-subj="textAreaInput"]'
    ).type('This is the case description ', { force: true });
    cy.get('[data-test-subj="insert-timeline-button"]').click({ force: true });
    cy.get('[data-test-subj="timeline-super-select-search-box"]').type('SIEM test{enter}');
    cy.get('[data-test-subj="timeline"]').should('be.visible');
    cy.get('[data-test-subj="timeline"]')
      .eq(1)
      .click({ force: true });
    cy.get('[data-test-subj="create-case-submit"]').click({ force: true });
    cy.get('[data-test-subj="create-case-loading-spinner"]').should('exist');
    cy.get('[data-test-subj="create-case-loading-spinner"]').should('not.exist'); */

    cy.get('[data-test-subj="backToCases"]').click({ force: true });

    cy.get('[data-test-subj="header-page-title"]')
      .invoke('text')
      .should('eql', 'Cases Beta');
    cy.get('[data-test-subj="openStatsHeader"]')
      .invoke('text')
      .should('eql', 'Open cases1');
    cy.get('[data-test-subj="closedStatsHeader"]')
      .invoke('text')
      .should('eql', 'Closed cases0');
    cy.get('[data-test-subj="open-case-count"]')
      .invoke('text')
      .should('eql', 'Open cases (1)');
    cy.get('[data-test-subj="closed-case-count"]')
      .invoke('text')
      .should('eql', 'Closed cases (0)');
    cy.get('[data-test-subj="options-filter-popover-button-Reporter"]')
      .invoke('text')
      .should('eql', 'Reporter1');
    cy.get('[data-test-subj="options-filter-popover-button-Tags"]')
      .invoke('text')
      .should('eql', 'Tags2');
    cy.get('[data-test-subj="case-details-link"]')
      .invoke('text')
      .should('eql', 'This is the title of the case');
    cy.get('[data-test-subj="case-table-column-createdBy"]')
      .invoke('text')
      .should('eql', 'elastic');
    cy.get('[data-test-subj="case-table-column-tags-0"]')
      .invoke('text')
      .should('eql', 'Tag1');
    cy.get('[data-test-subj="case-table-column-tags-1"]')
      .invoke('text')
      .should('eql', 'Tag2');
    cy.get('[data-test-subj="case-table-column-commentCount"]')
      .invoke('text')
      .should('eql', '0');
    cy.get('[data-test-subj="case-table-column-createdAt"]')
      .invoke('text')
      .should('include', 'ago');
    cy.get('[data-test-subj="case-table-column-external-notPushed"]')
      .invoke('text')
      .should('eql', 'Not pushed');
    cy.get('[data-test-subj="action-delete"]').should('exist');
    cy.get('[data-test-subj="action-close"]').should('exist');

    cy.get('[data-test-subj="case-details-link"]').click({ force: true });

    cy.get('[data-test-subj="header-page-title"]')
      .invoke('text')
      .should('eql', 'This is the title of the case');
    cy.get('[data-test-subj="case-view-status"]')
      .invoke('text')
      .should('eql', 'open');
    cy.get('[data-test-subj="user-action-title"] .euiFlexItem')
      .eq(1)
      .invoke('text')
      .should('eql', 'elastic');
    cy.get('[data-test-subj="user-action-title"] .euiFlexItem')
      .eq(2)
      .invoke('text')
      .should('eql', 'added description');
    cy.get('[data-test-subj="markdown-root"]')
      .invoke('text')
      .should('eql', 'This is the case description SIEM test');
    cy.get('[data-test-subj="case-view-username"]')
      .eq(0)
      .invoke('text')
      .should('eql', 'elastic');
    cy.get('[data-test-subj="case-view-username"]')
      .eq(1)
      .invoke('text')
      .should('eql', 'elastic');
    cy.get('[data-test-subj="case-tags"]')
      .invoke('text')
      .should('eql', 'Tag1Tag2');
    cy.get('[data-test-subj="push-to-service-now"]').should('have.attr', 'disabled');

    cy.get('[data-test-subj="markdown-link"]').then($element => {
      const timelineLink = $element.prop('href').match(/http(s?):\/\/\w*:\w*(\S*)/)[0];
      cy.visit('/app/kibana');
      cy.visit(timelineLink);
      cy.contains('a', 'SIEM');
      cy.get('[data-test-subj="timeline-title"]').should('exist');
      cy.get('[data-test-subj="timeline-title"]').should('have.attr', 'value', 'SIEM test');
      cy.get('[data-test-subj="timeline-description"]').should('have.attr', 'value', 'description');
      cy.get('[data-test-subj="timelineQueryInput"]').should('have.attr', 'value', 'host.name:*');
    });
  });
});
