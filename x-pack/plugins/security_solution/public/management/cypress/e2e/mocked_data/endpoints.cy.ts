/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';

describe('Endpoints page', () => {
  let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;

  before(() => {
    indexEndpointHosts().then((indexEndpoints) => {
      endpointData = indexEndpoints;
    });
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    if (endpointData) {
      endpointData.cleanup();
      // @ts-expect-error ignore setting to undefined
      endpointData = undefined;
    }
  });

  it('Loads the endpoints page', () => {
    loadPage(APP_ENDPOINTS_PATH);
    cy.contains('Hosts running Elastic Defend').should('exist');
  });
});
