/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNodeTLSOptions, getTLSSettingsFromConfig } from './get_node_tls_options';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('getNodeTLSOptions', () => {
  test('get node.js TLS options: rejectUnauthorized eql true for the verification mode "full"', () => {
    const nodeOption = getNodeTLSOptions(logger, 'full');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });

  test('get node.js TLS options: rejectUnauthorized eql true for the verification mode "certificate"', () => {
    const nodeOption = getNodeTLSOptions(logger, 'certificate');
    expect(nodeOption.checkServerIdentity).not.toBeNull();
    expect(nodeOption.rejectUnauthorized).toBeTruthy();
  });

  test('get node.js TLS options: rejectUnauthorized eql false for the verification mode "none"', () => {
    const nodeOption = getNodeTLSOptions(logger, 'none');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: false,
    });
  });

  test('get node.js TLS options: rejectUnauthorized eql true for the verification mode value which does not exist, the logger called with the proper warning message', () => {
    const nodeOption = getNodeTLSOptions(logger, 'notexist');
    expect(loggingSystemMock.collect(logger).warn).toMatchInlineSnapshot(`
    Array [
      Array [
        "Unknown ssl verificationMode: notexist",
      ],
    ]
  `);
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });
});

describe('getTLSSettingsFromConfig', () => {
  test('get verificationMode eql "none" if legacy rejectUnauthorized eql false', () => {
    const nodeOption = getTLSSettingsFromConfig(undefined, false);
    expect(nodeOption).toMatchObject({
      verificationMode: 'none',
    });
  });

  test('get verificationMode eql "none" if legacy rejectUnauthorized eql true', () => {
    const nodeOption = getTLSSettingsFromConfig(undefined, true);
    expect(nodeOption).toMatchObject({
      verificationMode: 'full',
    });
  });

  test('get verificationMode eql "certificate", ignore rejectUnauthorized', () => {
    const nodeOption = getTLSSettingsFromConfig('certificate', false);
    expect(nodeOption).toMatchObject({
      verificationMode: 'certificate',
    });
  });
});
