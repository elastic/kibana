/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { synthtrace } from '../../../synthtrace';
import { generateSpanStacktraceData } from './generate_span_stacktrace_data';

const start = '2022-01-01T00:00:00.000Z';
const end = '2022-01-01T00:15:00.000Z';

function getServiceInventoryUrl({ serviceName }: { serviceName: string }) {
  return url.format({
    pathname: `/app/apm/services/${serviceName}`,
    query: {
      rangeFrom: start,
      rangeTo: end,
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      serviceGroup: '',
      transactionType: 'request',
      comparisonEnabled: true,
      offset: '1d',
    },
  });
}

describe('Span stacktrace', () => {
  beforeEach(() => {
    cy.loginAsViewerUser();
  });
  describe('span flyout', () => {
    before(() => {
      generateSpanStacktraceData();
    });

    after(() => {
      synthtrace.clean();
    });
    it('Shows APM agent generated stacktrace', () => {
      cy.visitKibana(getServiceInventoryUrl({ serviceName: 'apm-generated' }));
      cy.contains('Transaction A').click();
      cy.contains('Span A').click();
      cy.getByTestSubj('spanStacktraceTab').click();
      cy.contains(
        'at org.apache.catalina.connector.OutputBuffer.flushByteBuffer(OutputBuffer.java:825)'
      );
    });

    it('Shows Otel generated stacktrace', () => {
      cy.visitKibana(getServiceInventoryUrl({ serviceName: 'otel-generated' }));
      cy.contains('Transaction A').click();
      cy.contains('Span A').click();
      cy.getByTestSubj('spanStacktraceTab').click();
      cy.contains(
        `java.lang.Throwable at co.elastic.otel.ElasticSpanProcessor.captureStackTrace(ElasticSpanProcessor.java:81)`
      );
    });
  });
});
