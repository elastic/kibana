/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidIpType } from './is_valid_ip_type';

describe('isValidIpType', () => {
  it('should validate IPv4', () => {
    expect(isValidIpType('127.0.0.1')).toBe(true);
  });

  it('should validate IPv6', () => {
    expect(isValidIpType('2001:db8::')).toBe(true);
  });

  it('should not validate invalid ip', () => {
    expect(isValidIpType('2001:db8:://12')).toBe(false);
    expect(isValidIpType('localhost')).toBe(false);
    expect(isValidIpType('127.0.0.')).toBe(false);
  });
});
