/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServiceStatusLevels } from '@kbn/core/server';
import { getKibanaStats } from '.';

describe('getKibanaStats', () => {
  const config = {
    allowAnonymous: true,
    kibanaIndex: '.kibana',
    kibanaVersion: '8.0.0',
    uuid: 'abc123',
    server: {
      name: 'server',
      hostname: 'host',
      port: 123,
    },
  };

  it('should return the stats', async () => {
    const getStatus = () => ({
      level: ServiceStatusLevels.available,
      summary: 'Service is working',
    });
    const stats = await getKibanaStats({ config, getStatus });
    expect(stats).toStrictEqual({
      uuid: config.uuid,
      name: config.server.name,
      index: config.kibanaIndex,
      host: config.server.hostname,
      locale: 'en',
      transport_address: `${config.server.hostname}:${config.server.port}`,
      version: '8.0.0',
      snapshot: false,
      status: 'green',
    });
  });

  it('should handle a non green status', async () => {
    const getStatus = () => ({
      level: ServiceStatusLevels.critical,
      summary: 'Service is NOT working',
    });
    const stats = await getKibanaStats({ config, getStatus });
    expect(stats).toStrictEqual({
      uuid: config.uuid,
      name: config.server.name,
      index: config.kibanaIndex,
      host: config.server.hostname,
      locale: 'en',
      transport_address: `${config.server.hostname}:${config.server.port}`,
      version: '8.0.0',
      snapshot: false,
      status: 'red',
    });
  });

  it('should handle no status', async () => {
    const getStatus = () => {
      return undefined;
    };
    const stats = await getKibanaStats({ config, getStatus });
    expect(stats).toStrictEqual({
      uuid: config.uuid,
      name: config.server.name,
      index: config.kibanaIndex,
      host: config.server.hostname,
      locale: 'en',
      transport_address: `${config.server.hostname}:${config.server.port}`,
      version: '8.0.0',
      snapshot: false,
      status: 'unknown',
    });
  });
});
