/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';

describe('Endpoint Policy Response', () => {
  before(() => {
    // TODO:PT load endpoint
    // TODO:PT load policy response with error on it
  });

  after(() => {
    // TODO:PT clean up data
  });

  beforeEach(() => {
    login();
  });

  describe('from Fleet Agent Details page', () => {
    // TODO: implement
    it.todo('should display policy response');
  });
});
