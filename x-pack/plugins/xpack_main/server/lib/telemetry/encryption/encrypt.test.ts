/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { telemetryJWKS } from './telemetry_jwks';

const encryptMock = jest.fn();

const mockCreateRequestEncryptor = jest.fn().mockResolvedValue({
  encrypt: encryptMock,
});

jest.mock('@elastic/request-crypto', () => ({
  createRequestEncryptor: mockCreateRequestEncryptor,
}));

import { encryptTelemetry, getKID } from './encrypt';

const createMockServer = (mode: 'dev' | 'prod') => ({
  config: () => ({
    get: () => mode === 'dev',
  }),
});

describe('getKID', () => {
  it(`returns 'kibana_dev' kid for development`, async () => {
    const mockServer = createMockServer('dev');
    const kid = getKID(mockServer);
    expect(kid).toBe('kibana_dev');
  });

  it(`returns 'kibana_prod' kid for development`, async () => {
    const mockServer = createMockServer('prod');
    const kid = getKID(mockServer);
    expect(kid).toBe('kibana_prod');
  });
});

describe('encryptTelemetry', () => {
  it('encrypts payload', async () => {
    const mockServer = createMockServer('prod');
    const payload = { some: 'value' };
    await encryptTelemetry(mockServer, payload);
    expect(mockCreateRequestEncryptor).toBeCalledWith(telemetryJWKS);
    expect(encryptMock).toBeCalled();
  });
});
