/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedHostsResponse } from '../../../../../common/endpoint/data_loaders/index_endpoint_hosts';
import { login } from '../../tasks/login';

describe('Endpoint Policy Response', () => {
  let loadedEndpoint: IndexedHostsResponse;

  before(() => {
    cy.task('indexEndpointHosts', { count: 1 }).then((indexEndpoints) => {
      loadedEndpoint = indexEndpoints;
    });

    // TODO:PT load policy response with error on it
  });

  after(() => {
    if (loadedEndpoint) {
      cy.task('deleteIndexedEndpointHosts', loadedEndpoint);
    }

    // TODO:PT clean up data
  });

  beforeEach(() => {
    login();
  });

  describe('from Fleet Agent Details page', () => {
    // TODO: implement
    it.todo('should display policy response with errors');
  });
});
