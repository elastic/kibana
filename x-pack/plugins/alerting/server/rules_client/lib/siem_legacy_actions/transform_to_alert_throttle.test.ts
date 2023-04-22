/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformToAlertThrottle } from './transform_to_alert_throttle';

describe('transformToAlertThrottle', () => {
  it('should return null when throttle is null OR no_actions', () => {
    expect(transformToAlertThrottle(null)).toBeNull();
    expect(transformToAlertThrottle('rule')).toBeNull();
    expect(transformToAlertThrottle('no_actions')).toBeNull();
  });
  it('should return same value for other throttle values', () => {
    expect(transformToAlertThrottle('1h')).toBe('1h');
    expect(transformToAlertThrottle('1m')).toBe('1m');
    expect(transformToAlertThrottle('1d')).toBe('1d');
  });
});
