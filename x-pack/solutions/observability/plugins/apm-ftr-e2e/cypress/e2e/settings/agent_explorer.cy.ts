/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import url from 'url';
import { synthtrace } from '../../../synthtrace';

const agentExplorerHref = url.format({
  query: {
    kuery: '',
    agentLanguage: '',
    serviceName: '',
    comparisonEnabled: 'true',
    environment: 'ENVIRONMENT_ALL',
  },
  pathname: '/app/apm/settings/agent-explorer',
});

function generateData({
  from,
  to,
  serviceName,
  agentName,
}: {
  from: number;
  to: number;
  serviceName: string;
  agentName: string;
}) {
  const range = timerange(from, to);

  const service = apm
    .service({
      agentVersion: '1.0.0',
      name: serviceName,
      environment: 'production',
      agentName,
    })
    .instance('instance-1')
    .podId('pod-1');

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) => [
      service
        .transaction({ transactionName: 'GET /apple 🍎 ' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ]);
}

describe('Agent explorer', () => {
  before(() => {
    const start = Date.now() - 1000 * 60 * 150;
    const end = Date.now() + 1000 * 60 * 5;

    synthtrace.index([
      ...generateData({
        from: start,
        to: end,
        serviceName: 'opbeans-node',
        agentName: 'nodejs',
      }),
    ]);
  });

  after(() => {
    synthtrace.clean();
  });

  describe('when logged in as viewer user', () => {
    beforeEach(() => {
      cy.loginAsViewerUser();
      cy.visitKibana(agentExplorerHref);
    });

    it('shows the agent list', () => {
      cy.contains('opbeans-node');
      cy.contains('nodejs');
    });

    it('opens agent details and clicks the instance', () => {
      cy.getByTestSubj('apmAgentExplorerListToggle').click();
      cy.contains('Agent Instances');
      cy.contains('production');
      cy.contains('instance-1').click();
      cy.location().should((loc) => {
        expect(loc.pathname).to.eq('/app/apm/services/opbeans-node/metrics');
      });
    });
  });
});
