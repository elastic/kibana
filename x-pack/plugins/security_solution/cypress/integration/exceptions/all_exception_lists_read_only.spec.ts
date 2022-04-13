/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '../../../common/test';
import { getExceptionList } from '../../objects/exception';
import { EXCEPTIONS_TABLE_SHOWING_LISTS } from '../../screens/exceptions';
import { createExceptionList } from '../../tasks/api_calls/exceptions';
import { dismissCallOut, getCallOut, waitForCallOutToBeShown } from '../../tasks/common/callouts';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { EXCEPTIONS_URL } from '../../urls/navigation';

const MISSING_PRIVILEGES_CALLOUT = 'missing-user-privileges';

describe('All exception lists - read only', () => {
  before(() => {
    esArchiverResetKibana();

    // Create exception list not used by any rules
    createExceptionList(getExceptionList(), getExceptionList().list_id);

    login(ROLES.reader);
    visitWithoutDateRange(EXCEPTIONS_URL, ROLES.reader);

    cy.reload();

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
  });

  it('Displays missing privileges primary callout', () => {
    waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');
  });

  context('When a user clicks Dismiss on the callouts', () => {
    it('We hide them and persist the dismissal', () => {
      waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');

      dismissCallOut(MISSING_PRIVILEGES_CALLOUT);
      cy.reload();
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

      getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
    });
  });
});
