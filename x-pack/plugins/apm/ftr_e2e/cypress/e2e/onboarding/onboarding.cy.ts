/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { synthtrace } from '../../../synthtrace';

const start = Date.now() - 1000;
const end = Date.now();

function generateData({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const synthGo1 = apm
    .service({
      name: 'synth-go-1',
      environment: 'production',
      agentName: 'go',
    })
    .instance('my-instance');

  return range.interval('1m').generator((timestamp) => {
    return [
      synthGo1
        .transaction({ transactionName: 'GET /apple 🍎' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ];
  });
}

describe('APM Onboarding', () => {
  describe('General navigation', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
      cy.visitKibana('/app/apm/onboarding');
    });

    it('includes section for APM Agents', () => {
      cy.contains('APM Agents');
      cy.contains('Node.js');
      cy.contains('Django');
      cy.contains('Flask');
      cy.contains('Ruby on Rails');
      cy.contains('Rack');
      cy.contains('Go');
      cy.contains('Java');
      cy.contains('.NET');
      cy.contains('PHP');
      cy.contains('OpenTelemetry');
    });

    it('navigation to different Tabs', () => {
      cy.contains('Django').click();
      cy.contains('pip install elastic-apm');

      cy.contains('Flask').click();
      cy.contains('pip install elastic-apm[flask]');

      cy.contains('Ruby on Rails').click();
      cy.contains("gem 'elastic-apm'");

      cy.contains('Rack').click();
      cy.contains("gem 'elastic-apm'");

      cy.contains('Go').click();
      cy.contains('go get go.elastic.co/apm');

      cy.contains('Java').click();
      cy.contains('-javaagent');

      cy.contains('.NET').click();
      cy.contains('Elastic.Apm.NetCoreAll');

      cy.contains('PHP').click();
      cy.contains('apk add --allow-untrusted <package-file>.apk');

      cy.contains('OpenTelemetry').click();
      cy.contains('Download the OpenTelemetry APM Agent or SDK');
    });
  });

  describe('check Agent Status', () => {
    beforeEach(() => {
      cy.loginAsEditorUser();
      cy.visitKibana('/app/apm/onboarding');
    });
    it('when no data is present', () => {
      cy.intercept('GET', '/internal/apm/observability_overview/has_data').as(
        'hasData'
      );
      cy.getByTestSubj('checkAgentStatus').click();
      cy.wait('@hasData');
      cy.getByTestSubj('agentStatusWarningCallout').should('exist');
    });

    it('when data is present', () => {
      synthtrace.index(
        generateData({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
      cy.intercept('GET', '/internal/apm/observability_overview/has_data').as(
        'hasData'
      );
      cy.getByTestSubj('checkAgentStatus').click();
      cy.wait('@hasData');
      cy.getByTestSubj('agentStatusSuccessCallout').should('exist');
      synthtrace.clean();
    });
  });

  describe('create API Key', () => {
    it('create the key successfully', () => {
      cy.loginAsApmManageOwnAndCreateAgentKeys();
      cy.visitKibana('/app/apm/onboarding');
      cy.intercept('POST', '/api/apm/agent_keys').as('createApiKey');
      cy.getByTestSubj('createApiKeyAndId').click();
      cy.wait('@createApiKey');
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('Django').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('Flask').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('Ruby on Rails').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('Rack').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('Go').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('Java').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('.NET').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('PHP').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');

      cy.contains('OpenTelemetry').click();
      cy.getByTestSubj('apiKeySuccessCallout').should('exist');
    });

    it('fails to create the key due to missing privileges', () => {
      cy.loginAsEditorUser();
      cy.visitKibana('/app/apm/onboarding');
      cy.intercept('POST', '/api/apm/agent_keys').as('createApiKey');
      cy.getByTestSubj('createApiKeyAndId').click();
      cy.wait('@createApiKey');
      cy.getByTestSubj('apiKeyWarningCallout').should('exist');
      cy.get('@createApiKey')
        .its('response')
        .then((res) => {
          expect(res.statusCode).to.equal(403);
        });
    });
  });
});
