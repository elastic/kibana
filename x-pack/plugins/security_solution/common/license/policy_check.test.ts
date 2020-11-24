/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEndpointPolicyValidForLicense } from './policy_check';

describe('policy_check licensed feature verification', () => {
  // mock license service

  it.todo('allows malware notification to be disabled with a Platinum license');
  it.todo('blocks malware notification changes below Platinum licenses');

  it.todo('allows malware notification message changes with a Platinum license');
  it.todo('blocks malware notification message changes below Platinum licenses');

  it.todo('allows default policyConfig with Basic');
});
