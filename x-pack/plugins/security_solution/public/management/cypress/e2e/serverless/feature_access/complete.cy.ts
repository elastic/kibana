/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureResponseActionAuthzAccess } from '../../../tasks/response_actions';
import { login, ROLE } from '../../../tasks/login';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../../../../../../common/endpoint/service/response_actions/constants';
import { getNoPrivilegesPage } from '../../../screens/common';
import { getEndpointManagementPageList } from '../../../screens';

describe(
  'App Features for Security Complete PLI',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: { productTypes: [{ product_line: 'security', product_tier: 'complete' }] },
    },
  },
  () => {
    const allPages = getEndpointManagementPageList();
    const deniedPages = allPages.filter(({ id }) => {
      return id !== 'endpointList' && id !== 'policyList';
    });
    const allowedPages = allPages.filter(({ id }) => {
      return id === 'endpointList' || id === 'policyList';
    });
    let username: string;
    let password: string;

    beforeEach(() => {
      login(ROLE.endpoint_operations_analyst).then((response) => {
        username = response.username;
        password = response.password;
      });
    });

    for (const { url, title, pageTestSubj } of allowedPages) {
      it(`should allow access to ${title}`, () => {
        cy.visit(url);
        cy.getByTestSubj(pageTestSubj).should('exist');
      });
    }

    for (const { url, title } of deniedPages) {
      it(`should not allow access to ${title}`, () => {
        cy.visit(url);
        getNoPrivilegesPage().should('exist');
      });
    }

    // No access to response actions (except `unisolate`)
    for (const actionName of RESPONSE_ACTION_API_COMMANDS_NAMES.filter(
      (apiName) => apiName !== 'unisolate'
    )) {
      it(`should not allow access to Response Action: ${actionName}`, () => {
        ensureResponseActionAuthzAccess('none', actionName, username, password);
      });
    }

    it('should have access to `unisolate` api', () => {
      ensureResponseActionAuthzAccess('all', 'unisolate', username, password);
    });
  }
);
