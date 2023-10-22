/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import { subj as testSubjSelector } from '@kbn/test-subj-selector';
import 'cypress-data-session';
// @ts-ignore
import registerCypressGrep from '@cypress/grep';

import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../common/endpoint/types';
import type { CreateAndEnrollEndpointHostResponse } from '../../../../scripts/endpoint/common/endpoint_host_services';
import { loadPage } from '../tasks/common';
import { login, ROLE } from '../tasks/login';
import { createEndpointHost } from '../tasks/create_endpoint_host';
import { enableAllPolicyProtections } from '../tasks/endpoint_policy';
import { getEndpointIntegrationVersion, createAgentPolicyTask } from '../tasks/fleet';
import { deleteAllLoadedEndpointData } from '../tasks/delete_all_endpoint_data';

registerCypressGrep();

const ENDPOINT_HOST_SESSION_NAME = 'endpointHost';

export interface EndpointHostSession {
  indexedPolicy: IndexedFleetEndpointPolicyResponse;
  policy: PolicyData;
  createdHost: CreateAndEnrollEndpointHostResponse;
}

Cypress.Commands.addQuery<'getByTestSubj'>(
  'getByTestSubj',
  function getByTestSubj(selector, options) {
    const getFn = cy.now('get', testSubjSelector(selector), options) as (
      subject: Cypress.Chainable<JQuery<HTMLElement>>
    ) => Cypress.Chainable<JQuery<HTMLElement>>;

    return (subject) => {
      if (subject) {
        const errMessage =
          '`cy.getByTestSubj()` is a parent query and can not be chained off a existing subject. Did you mean to use `.findByTestSubj()`?';
        cy.now('log', errMessage, [selector, subject]);
        throw new TypeError(errMessage);
      }

      return getFn(subject);
    };
  }
);

Cypress.Commands.addQuery<'findByTestSubj'>(
  'findByTestSubj',
  function findByTestSubj(selector, options) {
    return (subject) => {
      Cypress.ensure.isElement(subject, this.get('name'), cy);
      return subject.find(testSubjSelector(selector), options);
    };
  }
);

Cypress.Commands.add(
  'waitUntil',
  { prevSubject: 'optional' },
  (subject, fn, { interval = 500, timeout = 30000 } = {}) => {
    let attempts = Math.floor(timeout / interval);

    const completeOrRetry = (result: boolean) => {
      if (result) {
        return result;
      }
      if (attempts < 1) {
        throw new Error(`Timed out while retrying, last result was: {${result}}`);
      }
      cy.wait(interval, { log: false }).then(() => {
        attempts--;
        return evaluate();
      });
    };

    const evaluate = () => {
      const result = fn(subject);

      if (typeof result === 'boolean') {
        return completeOrRetry(result);
      } else if ('then' in result) {
        // @ts-expect-error
        return result.then(completeOrRetry);
      } else {
        throw new Error(
          `Unknown return type from callback: ${Object.prototype.toString.call(result)}`
        );
      }
    };

    return evaluate();
  }
);

Cypress.on('uncaught:exception', () => false);

Cypress.Commands.add('createEndpointHost', () =>
  cy.dataSession(
    ENDPOINT_HOST_SESSION_NAME,
    () => {
      let indexedPolicy: IndexedFleetEndpointPolicyResponse;
      let policy: PolicyData;
      let createdHost: CreateAndEnrollEndpointHostResponse;

      return getEndpointIntegrationVersion().then((version) =>
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
          policy = indexedPolicy.integrationPolicies[0];

          return enableAllPolicyProtections(policy.id).then(() => {
            // Create and enroll a new Endpoint host
            return createEndpointHost(policy.policy_id).then((host) => {
              createdHost = host as CreateAndEnrollEndpointHostResponse;

              return {
                indexedPolicy,
                policy,
                createdHost,
              };
            });
          });
        })
      );
    },
    true // don't invalidate the session when the test rerenders
  )
);

Cypress.Commands.add('removeEndpointHost', () => {
  cy.getCreatedHostData().then((endpointHost) => {
    if (endpointHost) {
      if (endpointHost.createdHost) {
        cy.task('destroyEndpointHost', endpointHost.createdHost);
      }

      if (endpointHost.indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', endpointHost.indexedPolicy);
      }

      if (endpointHost.createdHost) {
        deleteAllLoadedEndpointData({ endpointAgentIds: [endpointHost.createdHost.agentId] });
      }
    }
  });
});

Cypress.Commands.add('getCreatedHostData', () =>
  Cypress.getDataSession(ENDPOINT_HOST_SESSION_NAME)
);

// Login as a SOC Manager to properly initialize Security Solution App
before(() => {
  login(ROLE.soc_manager);
  loadPage('/app/security/alerts');
  cy.getByTestSubj('manage-alert-detection-rules').should('exist');
});
