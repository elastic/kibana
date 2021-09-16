/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCase1 } from '../../objects/case';

import {
  CASE_DETAILS_PAGE_TITLE,
  CASE_CONFLICT_CALL_OUT_DISMISS,
  CASE_CONFLICT_CALL_OUT_REDIRECT,
} from '../../screens/case_details';

import { goToCaseDetails } from '../../tasks/all_cases';
import { createCase } from '../../tasks/api_calls/cases';
import { dismissConflict, redirectConflict } from '../../tasks/case_details';
import { cleanKibana } from '../../tasks/common';
import { loginAndWaitForPageWithoutDateRange } from '../../tasks/login';

import { CASES_URL } from '../../urls/navigation';

describe('Resolve Cases', () => {
  beforeEach(() => {
    cleanKibana();
    createCase(getCase1()).then((response) => {
      cy.wrap({
        ...getCase1(),
        id: response.body.id,
      }).as('myCase');
    });
  });

  it('Resolves the case with exactMatch', function () {
    loginAndWaitForPageWithoutDateRange(CASES_URL);
    goToCaseDetails();

    cy.url().should('include', `cases/${this.myCase.id}`);

    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', this.myCase.name);
    cy.get(CASE_CONFLICT_CALL_OUT_DISMISS).should('not.exist');
    cy.get(CASE_CONFLICT_CALL_OUT_REDIRECT).should('not.exist');
  });

  // TODO: implement createAliasCase function and remove skip
  it.skip('Resolves the case with aliasMatch redirect', function () {
    const myAliasCase = this.myCase; // TODO: const myAliasCase = createAliasCase(this.myCase);
    loginAndWaitForPageWithoutDateRange(CASES_URL);

    goToCaseDetails();

    cy.url().should('include', `cases/${myAliasCase.id}`);
    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', myAliasCase.name);
  });

  // TODO: implement createConflictCase function and remove skip
  it.skip('Resolves the case with conflict dismiss', function () {
    // TODO: createConflictCase(this.myCase);
    loginAndWaitForPageWithoutDateRange(CASES_URL);

    goToCaseDetails();
    cy.url().should('include', `cases/${this.myCase.id}`);
    cy.get(CASE_CONFLICT_CALL_OUT_DISMISS).should('exist');

    dismissConflict();

    cy.get(CASE_CONFLICT_CALL_OUT_DISMISS).should('not.exist');
    cy.url().should('include', `cases/${this.myCase.id}`);
    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', this.myCase.name);
  });

  // TODO: implement createConflictCase function and remove skip
  it.skip('Resolves the case with conflict redirect', function () {
    const myConflictCase = this.myCase; // TODO: const myConflictCase = createConflictCase(this.myCase);
    createCase(myConflictCase);
    loginAndWaitForPageWithoutDateRange(CASES_URL);

    goToCaseDetails();
    cy.url().should('include', `cases/${this.myCase.id}`);

    cy.get(CASE_CONFLICT_CALL_OUT_REDIRECT).should('exist');

    redirectConflict();

    cy.url().should('include', `cases/${myConflictCase.id}`);
    cy.get(CASE_DETAILS_PAGE_TITLE).should('have.text', myConflictCase.name);
  });
});
