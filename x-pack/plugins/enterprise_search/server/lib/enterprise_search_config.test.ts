/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockReadFileSync } from '../__mocks__/fs.mock';

import http from 'http';
import https from 'https';

import { EnterpriseSearchConfig, config } from './enterprise_search_config';

test('set correct defaults', () => {
  const configValue = new EnterpriseSearchConfig(config.schema.validate({}));
  expect(configValue).toEqual({
    host: undefined,
    enabled: true,
    accessCheckTimeout: 5000,
    accessCheckTimeoutWarning: 300,
    rejectUnauthorized: false,
    certificateAuthorities: [],
    httpAgent: expect.any(http.Agent),
  });
});

describe('httpAgent', () => {
  it('should be an http.Agent when host URL is using HTTP', () => {
    const configValue = new EnterpriseSearchConfig(
      config.schema.validate({ host: 'http://example.org' })
    );
    expect(configValue.httpAgent instanceof http.Agent).toBe(true);
  });

  it('should be an http.Agent when host URL is invalid', () => {
    const configValue = new EnterpriseSearchConfig(config.schema.validate({ host: 'blergh:%' }));
    expect(configValue.httpAgent instanceof http.Agent).toBe(true);
  });

  it('should be an https.Agent when host URL is using HTTPS', () => {
    const configValue = new EnterpriseSearchConfig(
      config.schema.validate({ host: 'https://example.org' })
    );
    expect(configValue.httpAgent instanceof https.Agent).toBe(true);
  });
});

describe('reads files', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockReadFileSync.mockImplementation((path: string) => `content-of-${path}`);
  });

  it('reads certificate authorities when ssl.certificateAuthorities is a string', () => {
    const configValue = new EnterpriseSearchConfig(
      config.schema.validate({ ssl: { certificateAuthorities: 'some-path' } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.certificateAuthorities).toEqual(['content-of-some-path']);
  });

  it('reads certificate authorities when ssl.certificateAuthorities is an array', () => {
    const configValue = new EnterpriseSearchConfig(
      config.schema.validate({
        ssl: { certificateAuthorities: ['some-path', 'another-path'] },
      })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(2);
    expect(configValue.certificateAuthorities).toEqual([
      'content-of-some-path',
      'content-of-another-path',
    ]);
  });

  it('does not read anything when ssl.certificateAuthorities is empty', () => {
    const configValue = new EnterpriseSearchConfig(
      config.schema.validate({ ssl: { certificateAuthorities: [] } })
    );
    expect(mockReadFileSync).toHaveBeenCalledTimes(0);
    expect(configValue.certificateAuthorities).toEqual([]);
  });
});

describe('throws when config is invalid', () => {
  beforeAll(() => {
    const realFs = jest.requireActual('fs');
    mockReadFileSync.mockImplementation((path: string) => realFs.readFileSync(path));
  });

  it('throws if certificateAuthorities is invalid', () => {
    const value = { ssl: { certificateAuthorities: '/invalid/ca' } };
    expect(
      () => new EnterpriseSearchConfig(config.schema.validate(value))
    ).toThrowErrorMatchingInlineSnapshot(
      '"ENOENT: no such file or directory, open \'/invalid/ca\'"'
    );
  });
});
