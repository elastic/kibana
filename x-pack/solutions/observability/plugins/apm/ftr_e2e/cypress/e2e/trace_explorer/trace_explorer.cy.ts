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

const traceExplorerHref = url.format({
  pathname: '/app/apm/traces/explorer',
  query: {
    environment: 'ENVIRONMENT_ALL',
    rangeFrom: start,
    rangeTo: end,
  },
});

describe('Trace Explorer', () => {
  before(() => {
    synthtrace.index(
      opbeans({
        from: new Date(start).getTime(),
        to: new Date(end).getTime(),
      })
    );

    cy.updateAdvancedSettings({
      'observability:apmTraceExplorerTab': true,
    });
  });

  after(() => {
    synthtrace.clean();
  });

  beforeEach(() => {
    cy.loginAsViewerUser();
  });

  it('opens the action menu popup when clicking the investigate button', () => {
    cy.visitKibana(traceExplorerHref);
    cy.getByTestSubj('apmActionMenuButtonInvestigateButton').click();
    cy.getByTestSubj('apmActionMenuInvestigateButtonPopup');
  });
});
