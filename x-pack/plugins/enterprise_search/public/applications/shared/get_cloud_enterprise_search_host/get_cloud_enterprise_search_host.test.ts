/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCloudEnterpriseSearchHost } from './get_cloud_enterprise_search_host';

const defaultPortCloud = {
  cloudId:
    'gcp-cluster:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJDhhMDI4M2FmMDQxZjE5NWY3NzI5YmMwNGM2NmEwZmNlJDBjZDVjZDU2OGVlYmU1M2M4OWViN2NhZTViYWM4YjM3',
  deploymentId: 'gcp-cluster',
  isCloudEnabled: true,
  cloudHost: 'us-central1.gcp.cloud.es.io',
  cloudDefaultPort: '443',
  registerCloudService: jest.fn(),
  isServerlessEnabled: false,
  serverless: {
    projectId: undefined,
  },
};
// 9243
const customPortCloud = {
  cloudId:
    'custom-port:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvOjkyNDMkYWMzMWViYjkwMjQxNzczMTU3MDQzYzM0ZmQyNmZkNDYkYTRjMDYyMzBlNDhjOGZjZTdiZTg4YTA3NGEzYmIzZTA=',
  deploymentId: 'custom-port',
  isCloudEnabled: true,
  cloudHost: 'us-central1.gcp.cloud.es.io',
  cloudDefaultPort: '9243',
  registerCloudService: jest.fn(),
  isServerlessEnabled: false,
  serverless: {
    projectId: undefined,
  },
};
const missingDeploymentIdCloud = {
  cloudId:
    'dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvOjkyNDMkYWMzMWViYjkwMjQxNzczMTU3MDQzYzM0ZmQyNmZkNDYkYTRjMDYyMzBlNDhjOGZjZTdiZTg4YTA3NGEzYmIzZTA=',
  isCloudEnabled: true,
  registerCloudService: jest.fn(),
  isServerlessEnabled: false,
  serverless: {
    projectId: undefined,
  },
};
const noCloud = {
  cloudId: undefined,
  isCloudEnabled: false,
  registerCloudService: jest.fn(),
  isServerlessEnabled: false,
  serverless: {
    projectId: undefined,
  },
};

describe('getCloudEnterpriseSearchHost', () => {
  it('uses the default port', () => {
    expect(getCloudEnterpriseSearchHost(defaultPortCloud)).toBe(
      'https://gcp-cluster.ent.us-central1.gcp.cloud.es.io'
    );
  });

  it('allows a custom port', () => {
    expect(getCloudEnterpriseSearchHost(customPortCloud)).toBe(
      'https://custom-port.ent.us-central1.gcp.cloud.es.io:9243'
    );
  });

  it('is undefined when there is no deployment id', () => {
    expect(getCloudEnterpriseSearchHost(missingDeploymentIdCloud)).toBe(undefined);
  });

  it('is undefined with an undefined cloud id', () => {
    expect(getCloudEnterpriseSearchHost(noCloud)).toBe(undefined);
  });

  it('is undefined when cloud is undefined', () => {
    expect(getCloudEnterpriseSearchHost(undefined)).toBe(undefined);
  });
});
