/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { login, visitWithoutDateRange } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import { exceptionsListDetailsUrl } from '../../../urls/navigation';
import {
  editExceptionLisDetails,
  waitForExceptionListDetailToBeLoaded,
} from '../../../tasks/exceptions_table';
import { createExceptionList } from '../../../tasks/api_calls/exceptions';
import { esArchiverResetKibana } from '../../../tasks/es_archiver';
import {
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION,
} from '../../../screens/exceptions';

const LIST_NAME = 'My exception list';
const UPDATED_LIST_NAME = 'Updated exception list';
const LIST_DESCRIPTION = 'This is the exception list description.';
const UPDATED_LIST_DESCRIPTION = 'This is an updated version of the exception list description.';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: LIST_NAME,
  description: LIST_DESCRIPTION,
  list_id: 'exception_list_test',
});

describe('Exception list management page', () => {
  before(() => {
    esArchiverResetKibana();
    login();

    // Create exception list associated with a rule
    createExceptionList(getExceptionList1(), getExceptionList1().list_id).then((response) =>
      createRule({
        ...getNewRule(),
        exceptions_list: [
          {
            id: response.body.id,
            list_id: getExceptionList1().list_id,
            type: getExceptionList1().type,
            namespace_type: getExceptionList1().namespace_type,
          },
        ],
      })
    );
  });

  beforeEach(() => {
    visitWithoutDateRange(exceptionsListDetailsUrl(getExceptionList1().list_id));
    waitForExceptionListDetailToBeLoaded();
  });

  it('Edits list details', () => {
    // Check list details are loaded
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', LIST_NAME);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', LIST_DESCRIPTION);

    // Update list details in edit modal
    editExceptionLisDetails({
      name: { original: LIST_NAME, updated: UPDATED_LIST_NAME },
      description: { original: LIST_DESCRIPTION, updated: UPDATED_LIST_DESCRIPTION },
    });

    // Ensure that list details were updated
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', UPDATED_LIST_NAME);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', UPDATED_LIST_DESCRIPTION);

    // Ensure that list details changes persisted
    visitWithoutDateRange(exceptionsListDetailsUrl(getExceptionList1().list_id));
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', UPDATED_LIST_NAME);
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', UPDATED_LIST_DESCRIPTION);

    // Remove description
    editExceptionLisDetails({
      description: { original: UPDATED_LIST_DESCRIPTION, updated: null },
    });
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', 'Add a description');

    // Ensure description removal persisted
    visitWithoutDateRange(exceptionsListDetailsUrl(getExceptionList1().list_id));
    cy.get(EXCEPTIONS_LIST_MANAGEMENT_DESCRIPTION).should('have.text', 'Add a description');
  });
});
