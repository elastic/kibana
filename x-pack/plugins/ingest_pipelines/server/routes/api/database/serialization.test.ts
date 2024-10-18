/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeGeoipDatabase } from './serialization';

describe('serializeGeoipDatabase', () => {
  it('serializes maxmind database', () => {
    const licenseKey = '123';
    const createDbRequestBody = serializeGeoipDatabase({
      databaseType: 'maxmind',
      databaseName: 'GeoIP2-Anonymous-IP',
      maxmind: licenseKey,
    });

    expect(createDbRequestBody.name).toBe('GeoIP2-Anonymous-IP.mmdb');
    expect(createDbRequestBody.maxmind?.account_id).toBe(licenseKey);
    expect(createDbRequestBody.ipinfo).toBeUndefined();
  });
});
