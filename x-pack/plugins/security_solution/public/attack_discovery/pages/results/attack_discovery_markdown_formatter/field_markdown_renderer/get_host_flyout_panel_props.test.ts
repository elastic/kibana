/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHostFlyoutPanelProps, isHostName } from './get_host_flyout_panel_props';

describe('getHostFlyoutPanelProps', () => {
  describe('isHostName', () => {
    it('returns true for "host.name"', () => {
      const result = isHostName('host.name');

      expect(result).toBe(true);
    });

    it('returns true for "host.hostname"', () => {
      const result = isHostName('host.hostname');

      expect(result).toBe(true);
    });

    it('returns false for other field names', () => {
      const result = isHostName('some.other.field');

      expect(result).toBe(false);
    });
  });

  describe('getHostFlyoutPanelProps', () => {
    it('returns the correct FlyoutPanelProps', () => {
      const contextId = 'contextId';
      const hostName = 'foo';

      const result = getHostFlyoutPanelProps({ contextId, hostName });

      expect(result).toEqual({
        id: 'host-panel',
        params: { contextID: contextId, hostName, scopeId: 'alerts-page' },
      });
    });
  });
});
