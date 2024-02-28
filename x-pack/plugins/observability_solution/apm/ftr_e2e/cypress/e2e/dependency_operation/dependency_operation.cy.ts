/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { opbeans } from '../../fixtures/synthtrace/opbeans';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:15:00.000Z';

const dependencyOperationHref = url.format({
  pathname: '/app/apm/dependencies/operation',
  query: {
    dependencyName: 'postgresql',
    spanName: 'SELECT * FROM product',
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
  },
});

describe('Dependency operation', () => {
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  it('opens the action menu popup when clicking the investigate button', () => {
    cy.visitKibana(dependencyOperationHref);
    cy.getByTestSubj('apmActionMenuButtonInvestigateButton').click();
    cy.getByTestSubj('apmActionMenuInvestigateButtonPopup');
  });
});
