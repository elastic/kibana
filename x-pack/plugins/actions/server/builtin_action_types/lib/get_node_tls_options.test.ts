/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNodeTLSOptions } from './get_node_tls_options';

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

  test('get node.js TLS options: rejectUnauthorized eql false for the verification mode "none", ignore legacy settings if it is defined', () => {
    const nodeOption = getNodeTLSOptions('none', true);
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: false,
    });
  });

  test('get node.js TLS options: rejectUnauthorized eql if legacy tls setting is used and verification mode is not defined', () => {
    const nodeOption = getNodeTLSOptions(undefined, true);
    expect(nodeOption).toMatchObject({
      rejectUnauthorized: true,
    });
  });
});
