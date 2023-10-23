/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureOnResponder } from '../../screens/responder';
import {
  openResponseConsoleFromEndpointList,
  waitForEndpointListPageToBeLoaded,
} from '../../tasks/response_console';

import { login } from '../../tasks/login';

describe('Response console', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cy.createEndpointHost();
  });

  after(() => {
    cy.removeEndpointHost();
  });

  beforeEach(() => {
    login();
  });

  describe('From endpoint list', () => {
    it('should open responder', () => {
      cy.getCreatedHostData().then(({ createdHost }) => {
        waitForEndpointListPageToBeLoaded(createdHost.hostname);
      });
      openResponseConsoleFromEndpointList();
      ensureOnResponder();
    });
  });
});
