/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { synthtrace } from '../../../../synthtrace';
import { generateLargeTrace } from './generate_large_trace';

const start = '2021-10-10T00:00:00.000Z';
const end = '2021-10-10T00:01:00.000Z';
const rootTransactionName = `Large trace`;

const timeRange = { rangeFrom: start, rangeTo: end };

describe('Large Trace in waterfall', () => {
  before(() => {
    synthtrace.clean();

    generateLargeTrace({
      start: new Date(start).getTime(),
      end: new Date(end).getTime(),
      rootTransactionName,
      repeaterFactor: 10,
      environment: 'large_trace',
    });

    cy.loginAsViewerUser();
  });

  describe('when navigating to a trace sample', () => {
    it('shows warning about trace size', () => {
      cy.visitKibana(
        `/app/apm/services/synth-rum/transactions/view?${new URLSearchParams({
          ...timeRange,
          transactionName: rootTransactionName,
        })}`
      );

      cy.getByTestSubj('apmWaterfallSizeWarning').should(
        'have.text',
        'The number of items in this trace is 15551 which is higher than the current limit of 5000. Please increase the limit via `xpack.apm.ui.maxTraceItems` to see the full trace'
      );
    });

    it('does not show the warning about trace size', () => {
      cy.intercept('GET', '/internal/apm/traces/**', (req) => {
        req.query.maxTraceItems = 20000;
      }).as('getTraces');

      cy.visitKibana(
        `/app/apm/services/synth-rum/transactions/view?${new URLSearchParams({
          ...timeRange,
          transactionName: rootTransactionName,
        })}`
      );

      cy.getByTestSubj('apmWaterfallSizeWarning').should('not.exist');
    });
  });
});
