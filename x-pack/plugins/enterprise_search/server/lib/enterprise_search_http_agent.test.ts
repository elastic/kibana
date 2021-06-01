/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('fs', () => ({ readFileSync: jest.fn() }));
import { readFileSync } from 'fs';

import http from 'http';
import https from 'https';

import { ConfigType } from '../';

import { entSearchHttpAgent, loadCertificateAuthorities } from './enterprise_search_http_agent';

describe('entSearchHttpAgent', () => {
  it('should be an http.Agent when host URL is using HTTP', () => {
    const httpAgent = entSearchHttpAgent({ host: 'http://example.org' } as ConfigType);
    expect(httpAgent instanceof http.Agent).toBe(true);
  });

  it('should be an http.Agent when host URL is invalid', () => {
    const httpAgent = entSearchHttpAgent({ host: '##!notarealurl#$', ssl: {} } as ConfigType);
    expect(httpAgent instanceof http.Agent).toBe(true);
  });

  it('should be an https.Agent when host URL is using HTTPS', () => {
    const httpAgent = entSearchHttpAgent({ host: 'https://example.org', ssl: {} } as ConfigType);
    expect(httpAgent instanceof https.Agent).toBe(true);
  });
});

describe('loadCertificateAuthorities', () => {
  beforeEach(() => {
    readFileSync.mockReset();
    readFileSync.mockImplementation((path: string) => `content-of-${path}`);
  });

  it('reads certificate authorities when ssl.certificateAuthorities is a string', () => {
    const certs = loadCertificateAuthorities('some-path');
    expect(readFileSync).toHaveBeenCalledTimes(1);
    expect(certs).toEqual(['content-of-some-path']);
  });

  it('reads certificate authorities when ssl.certificateAuthorities is an array', () => {
    const certs = loadCertificateAuthorities(['some-path', 'another-path']);
    expect(readFileSync).toHaveBeenCalledTimes(2);
    expect(certs).toEqual(['content-of-some-path', 'content-of-another-path']);
  });

  it('does not read anything when ssl.certificateAuthorities is empty', () => {
    const certs = loadCertificateAuthorities([]);
    expect(readFileSync).toHaveBeenCalledTimes(0);
    expect(certs).toEqual([]);
  });
});

describe('loadCertificateAuthorities error handling', () => {
  beforeAll(() => {
    const realFs = jest.requireActual('fs');
    readFileSync.mockImplementation((path: string) => realFs.readFileSync(path));
  });

  it('throws if certificateAuthorities is invalid', () => {
    expect(() => loadCertificateAuthorities('/invalid/ca')).toThrowErrorMatchingInlineSnapshot(
      '"ENOENT: no such file or directory, open \'/invalid/ca\'"'
    );
  });
});
