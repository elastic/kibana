/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureResponseActionAuthzAccess } from '../../../tasks/response_actions';
import { login, ROLE } from '../../../tasks/login';
import { EDR_COMMANDS_MAPPING } from '../../../../../../common/endpoint/service/response_actions/constants';
import {
  getEndpointManagementPageList,
  getFleetAgentListTable,
  visitFleetAgentList,
} from '../../../screens';

describe(
  'App Features for Security Complete PLI with Endpoint Complete Addon',
  {
    tags: ['@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
        // This is not needed for this test, but it's a good example of
        // how to enable experimental features in the Cypress tests.
        // kbnServerArgs: [
        //   `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        //     'featureFlagName',
        //   ])}`,
        // ],
      },
    },
  },
  () => {
    describe('Endpoint Operations Analyst', () => {
      const allPages = getEndpointManagementPageList();
      let username: string;
      let password: string;

      beforeEach(() => {
        login(ROLE.endpoint_operations_analyst).then((response) => {
          username = response.username;
          password = response.password;
        });
      });

      for (const { url, title, pageTestSubj } of allPages) {
        it(`should allow access to ${title}`, () => {
          cy.visit(url);
          cy.getByTestSubj(pageTestSubj).should('exist');
        });
      }

      for (const actionName of EDR_COMMANDS_MAPPING.endpoint) {
        it(`should allow access to Response Action: ${actionName}`, () => {
          ensureResponseActionAuthzAccess('all', actionName, username, password);
        });
      }

      it(`should have access to Fleet`, () => {
        visitFleetAgentList();
        getFleetAgentListTable().should('exist');
      });
    });

    describe('Elastic superuser', () => {
      let username: string;
      let password: string;

      beforeEach(() => {
        login(ROLE.elastic_serverless).then((response) => {
          username = response.username;
          password = response.password;
        });
      });

      for (const actionName of EDR_COMMANDS_MAPPING.endpoint) {
        it(`should allow access to Response Action: ${actionName}`, () => {
          ensureResponseActionAuthzAccess('all', actionName, username, password);
        });
      }

      it(`should have access to Fleet`, () => {
        visitFleetAgentList();
        getFleetAgentListTable().should('exist');
      });
    });
  }
);
