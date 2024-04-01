/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkFleetServerVersion } from './check_fleet_server_versions';

describe('checkFleetServerVersion', () => {
  it('should not throw if no force is specified and patch is newer', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(() => checkFleetServerVersion('8.4.1', fleetServers, false)).not.toThrowError();
    expect(() => checkFleetServerVersion('8.4.1-SNAPSHOT', fleetServers, false)).not.toThrowError();
  });

  it('should throw if no force is specified and minor is newer', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(() => checkFleetServerVersion('8.5.1', fleetServers, false)).toThrowError(
      'Cannot upgrade to version 8.5.1 because it is higher than the latest fleet server version 8.4.0.'
    );
  });

  it('should throw if force is specified and patch should not be considered', () => {
    const fleetServers = [
      { local_metadata: { elastic: { agent: { version: '8.3.0' } } } },
      { local_metadata: { elastic: { agent: { version: '8.4.0' } } } },
    ] as any;
    expect(() => checkFleetServerVersion('8.5.1', fleetServers, true)).toThrowError(
      'Cannot force upgrade to version 8.5.1 because it does not satisfy the major and minor of the latest fleet server version 8.4.0.'
    );
  });

  it('should not throw in serverless if there is not in fleetServers', () => {
    const fleetServers = [] as any;
    expect(() => checkFleetServerVersion('8.5.1', fleetServers, true)).not.toThrow();
  });
});
