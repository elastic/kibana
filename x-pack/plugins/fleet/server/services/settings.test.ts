/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from './app_context';
import { getCloudFleetServersHosts } from './settings';

jest.mock('./app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

describe('getCloudFleetServersHosts', () => {
  it('should return undefined if cloud is not setup', () => {
    expect(getCloudFleetServersHosts()).toBeUndefined();
  });

  it('should return fleet server hosts if cloud is correctly setup with no default port in the cloud ID', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbyRjZWM2ZjI2MWE3NGJmMjRjZTMzYmI4ODExYjg0Mjk0ZiRjNmMyY2E2ZDA0MjI0OWFmMGNjN2Q3YTllOTYyNTc0Mw==',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
    });

    expect(getCloudFleetServersHosts()).toMatchInlineSnapshot(`
      Array [
        "https://deployment-id-1.fleet.us-east-1.aws.found.io:9243",
      ]
    `);
  });

  it('should return fleet server hosts if cloud is correctly setup with a default port of 443 in the cloud ID', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'dXMtZWFzdC0xLmF3cy5mb3VuZC5pbzo0NDMkY2VjNmYyNjFhNzRiZjI0Y2UzM2JiODgxMWI4NDI5NGYkYzZjMmNhNmQwNDIyNDlhZjBjYzdkN2E5ZTk2MjU3NDM=',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
    });

    expect(getCloudFleetServersHosts()).toMatchInlineSnapshot(`
      Array [
        "https://deployment-id-1.fleet.us-east-1.aws.found.io",
      ]
    `);
  });

  it('should return fleet server hosts if cloud is correctly setup with a default port', () => {
    mockedAppContextService.getCloud.mockReturnValue({
      cloudId:
        'test:dGVzdC5mcjo5MjQzJGRhM2I2YjNkYWY5ZDRjODE4ZjI4ZmEzNDdjMzgzODViJDgxMmY4NWMxZjNjZTQ2YTliYjgxZjFjMWIxMzRjNmRl',
      isCloudEnabled: true,
      deploymentId: 'deployment-id-1',
      apm: {},
    });

    expect(getCloudFleetServersHosts()).toMatchInlineSnapshot(`
      Array [
        "https://deployment-id-1.fleet.test.fr:9243",
      ]
    `);
  });
});
