/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreconfiguredFleetServerHostFromConfig } from './fleet_server_host';

jest.mock('../fleet_server_host');

describe('getPreconfiguredFleetServerHostFromConfig', () => {
  it('should work with preconfigured fleetServerHosts', () => {
    const config = {
      fleetServerHosts: [
        {
          id: 'fleet-123',
          name: 'TEST',
          is_default: true,
          host_urls: ['http://test.fr'],
        },
      ],
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toEqual(config.fleetServerHosts);
  });

  it('should work with agents.fleet_server.hosts', () => {
    const config = {
      agents: { fleet_server: { hosts: ['http://test.fr'] } },
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toEqual([
      {
        id: 'fleet-default-fleet-server-host',
        name: 'Default',
        host_urls: ['http://test.fr'],
        is_default: true,
      },
    ]);
  });

  it('should work with agents.fleet_server.hosts and preconfigured outputs', () => {
    const config = {
      agents: { fleet_server: { hosts: ['http://test.fr'] } },
      fleetServerHosts: [
        {
          id: 'fleet-123',
          name: 'TEST',
          is_default: false,
          host_urls: ['http://test.fr'],
        },
      ],
    };

    const res = getPreconfiguredFleetServerHostFromConfig(config);

    expect(res).toHaveLength(2);
    expect(res.map(({ id }) => id)).toEqual(['fleet-123', 'fleet-default-fleet-server-host']);
  });

  it('should throw if there is multiple default outputs', () => {
    const config = {
      agents: { fleet_server: { hosts: ['http://test.fr'] } },
      fleetServerHosts: [
        {
          id: 'fleet-123',
          name: 'TEST',
          is_default: true,
          host_urls: ['http://test.fr'],
        },
      ],
    };

    expect(() => getPreconfiguredFleetServerHostFromConfig(config)).toThrowError(
      /Only one default Fleet Server host is allowed/
    );
  });
});
