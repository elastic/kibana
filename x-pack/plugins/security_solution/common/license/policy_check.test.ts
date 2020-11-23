/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEndpointPolicyValidForLicense } from './policy_check';

describe('policy_check licensed feature verification', () => {
  // mock license service

  it.skip('allows malware notification to be disabled with a Platinum license');
  it.skip('blocks malware notification changes below Platinum licenses');

  it.skip('allows malware notification message changes with a Platinum license');
  it.skip('blocks malware notification message changes below Platinum licenses');

  it.skip('allows default policyConfig with Basic');
});
