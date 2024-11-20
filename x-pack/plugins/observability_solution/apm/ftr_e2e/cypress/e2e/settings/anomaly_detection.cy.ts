/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { synthtrace } from '../../../synthtrace';

const basePath = '/app/apm/settings/anomaly-detection';

const timeRange = {
  rangeFrom: '2021-10-10T00:00:00.000Z',
  rangeTo: '2021-10-10T00:15:00.000Z',
};

function generateData({
  from,
  to,
  serviceName,
  environment,
}: {
  from: number;
  to: number;
  serviceName: string;
  environment: string;
}) {
  const range = timerange(from, to);

  const service1 = apm
    .service({
      name: serviceName,
      environment,
      agentName: 'java',
    })
    .instance('service-1-prod-1')
    .podId('service-1-prod-1-pod');

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) => [
      service1
        .transaction({ transactionName: 'GET /apple 🍎 ' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ]);
}

const getAbleToModifyCase = () => {
  it('should be able to modify settings', () => {
    const { rangeFrom, rangeTo } = timeRange;
    const TEST_ENV = 'test environment ' + new Date().toISOString();

    synthtrace.index(
      generateData({
        from: new Date(rangeFrom).getTime(),
        to: new Date(rangeTo).getTime(),
        serviceName: 'opbeans-node',
        environment: TEST_ENV,
      })
    );

    cy.visitKibana(basePath);
    const button = cy.get('button[data-test-subj="apmJobsListCreateJobButton"]');
    button.should('not.be.disabled');
    button.click();
    cy.get('div[data-test-subj="comboBoxInput"]').click();
    cy.get(`button[title="${TEST_ENV}"]`).click();
    cy.get('button[data-test-subj="apmAddEnvironmentsCreateJobsButton"]').click();
    cy.intercept('GET', '/internal/apm/settings/anomaly-detection/jobs*').as('internalApiRequest');
    cy.wait('@internalApiRequest');
    cy.contains('Anomaly detection jobs created');
  });
};

const getUnableToModifyCase = () => {
  it('should not be able to modify settings', () => {
    cy.visitKibana(basePath);
    const button = cy.get('button[data-test-subj="apmJobsListCreateJobButton"]');
    button.should('be.disabled');
  });
};

describe('Anomaly detection', () => {
  after(() => {
    synthtrace.clean();
  });

  describe('when logged in as a viewer', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
    });

    getUnableToModifyCase();
  });

  describe('when logged in as an editor', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
    });

    getAbleToModifyCase();
  });

  describe('when logged in as a viewer with write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmReadPrivilegesWithWriteSettingsUser();
    });

    getAbleToModifyCase();
  });

  describe('when logged in as an editor without write settings access', () => {
    beforeEach(() => {
      cy.loginAsApmAllPrivilegesWithoutWriteSettingsUser();
    });

    getUnableToModifyCase();
  });
});
