/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFullAgentPolicyKibanaConfig } from './full_agent_policy_kibana_config';

describe('Fleet - getFullAgentPolicyKibanaConfig', () => {
  it('should return no path when there is no path', () => {
    expect(getFullAgentPolicyKibanaConfig(['http://localhost:5601'])).toEqual({
      hosts: ['localhost:5601'],
      protocol: 'http',
    });
  });
  it('should return correct config when there is a path', () => {
    expect(getFullAgentPolicyKibanaConfig(['http://localhost:5601/ssg'])).toEqual({
      hosts: ['localhost:5601'],
      protocol: 'http',
      path: '/ssg/',
    });
  });
  it('should return correct config when there is a path that ends in a slash', () => {
    expect(getFullAgentPolicyKibanaConfig(['http://localhost:5601/ssg/'])).toEqual({
      hosts: ['localhost:5601'],
      protocol: 'http',
      path: '/ssg/',
    });
  });
  it('should return correct config when there are multiple hosts', () => {
    expect(
      getFullAgentPolicyKibanaConfig(['http://localhost:5601/ssg/', 'http://localhost:3333/ssg/'])
    ).toEqual({
      hosts: ['localhost:5601', 'localhost:3333'],
      protocol: 'http',
      path: '/ssg/',
    });
  });
});
