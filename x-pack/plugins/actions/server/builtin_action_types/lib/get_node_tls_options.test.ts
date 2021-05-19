/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNodeTLSOptions, getTLSSettingsFromConfig } from './get_node_tls_options';

describe('getNodeTLSOptions', () => {
  test('get node.js TLS options: rejectUnauthorized eql true for the verification mode "full"', () => {
    const nodeOption = getNodeTLSOptions('full');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });

  test('get node.js TLS options: rejectUnauthorized eql true for the verification mode "certificate"', () => {
    const nodeOption = getNodeTLSOptions('certificate');
    expect(nodeOption.checkServerIdentity).not.toBeNull();
    expect(nodeOption.rejectUnauthorized).toBeTruthy();
  });

  test('get node.js TLS options: rejectUnauthorized eql false for the verification mode "none"', () => {
    const nodeOption = getNodeTLSOptions('none');
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: false,
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
