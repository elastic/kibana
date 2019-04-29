/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { canReadUnencryptedTelemetryData } from './get_privilege';

describe('canReadUnencryptedTelemetryData', () => {
  const allowedRoles = ['superuser', 'remote_monitoring_collector', 'remote_monitoring_agent'];

  allowedRoles.forEach(role => {
    it(`returns true for the role ${role}`, () => {
      const result = canReadUnencryptedTelemetryData([role]);
      expect(result).toBe(true);
    });
  });

  it('returns true on multiple valid roles', () => {
    const result = canReadUnencryptedTelemetryData(allowedRoles);
    expect(result).toBe(true);
  });

  it('returns true on one valid role with multiple roles', () => {
    const result = canReadUnencryptedTelemetryData([allowedRoles[0], 'invalid_role']);
    expect(result).toBe(true);
  });

  it('returns false on empty roles', () => {
    const result = canReadUnencryptedTelemetryData([]);
    expect(result).toBe(false);
  });

  it('returns false on invalid roles', () => {
    const result = canReadUnencryptedTelemetryData(['invalid_role']);
    expect(result).toBe(false);
  });
});
