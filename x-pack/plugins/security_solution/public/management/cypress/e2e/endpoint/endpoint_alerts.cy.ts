/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Endpoint generated alerts', () => {
  before(() => {
    // 1. Create agent policy with endpoint policy with all protections enabled
    // 2. create and enroll new host with above agent policy
  });

  after(() => {
    // 1. delete VM created
    // 2, Force-delete host from fleet (so we can delete policy)
    // 3, Removed policy created
  });

  it('should create an alert', () => {
    // FIXME:PT implement test
  });
});
