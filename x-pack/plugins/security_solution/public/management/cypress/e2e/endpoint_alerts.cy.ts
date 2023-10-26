/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsTableRows, navigateToAlertsList } from '../screens/alerts';
import { waitForEndpointAlerts } from '../tasks/alerts';
import { request } from '../tasks/common';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import { login, ROLE } from '../tasks/login';
import { EXECUTE_ROUTE } from '../../../../common/endpoint/constants';
import { waitForActionToComplete } from '../tasks/response_actions';

describe('Endpoint generated alerts', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.createEndpointHost();
  });

  after(() => {
    cy.removeEndpointHost();
  });

  beforeEach(() => {
    login(ROLE.soc_manager);
  });

  it('should create a Detection Engine alert from an endpoint alert', () => {
    // Triggers a Malicious Behaviour alert on Linux system (`grep *` was added only to identify this specific alert)
    const executeMaliciousCommand = `bash -c cat /dev/tcp/foo | grep ${Math.random()
      .toString(16)
      .substring(2)}`;

    cy.getCreatedHostData().then(({ createdHost }) => {
      // Send `execute` command that triggers malicious behaviour using the `execute` response action
      request<ResponseActionApiResponse>({
        method: 'POST',
        url: EXECUTE_ROUTE,
        body: {
          endpoint_ids: [createdHost.agentId],
          parameters: {
            command: executeMaliciousCommand,
          },
        },
      })
        .then((response) => waitForActionToComplete(response.body.data.id))
        .then(() => {
          return waitForEndpointAlerts(createdHost.agentId, [
            {
              term: { 'process.group_leader.args': executeMaliciousCommand },
            },
          ]);
        })
        .then(() => {
          return navigateToAlertsList(
            `query=(language:kuery,query:'agent.id: "${createdHost.agentId}" ')`
          );
        });
    });

    getAlertsTableRows().should('have.length.greaterThan', 0);
  });
});
