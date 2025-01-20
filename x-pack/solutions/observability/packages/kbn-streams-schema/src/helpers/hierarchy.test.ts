/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDescendantOf, isChildOf, getParentId, isWiredRoot, getAncestors } from './hierarchy';

describe('hierarchy helpers', () => {
  describe('isDescendantOf', () => {
    it('should return true for valid descendant streams', () => {
      expect(isDescendantOf('logs.app', 'logs.app.server')).toBe(true);
    });

    it('should return false for invalid descendant streams', () => {
      expect(isDescendantOf('metrics.app', 'logs.app.server')).toBe(false);
      expect(isDescendantOf('logs-app-server', 'logs.app.server')).toBe(false);
      expect(isDescendantOf('logs-app', 'logs.app.server')).toBe(false);
      expect(isDescendantOf('logs.app', 'logs.app')).toBe(false);
    });

    it('should return true for valid DSNS descendant streams', () => {
      expect(isDescendantOf('logs-app-default', 'logs-app.server-default')).toBe(true);
      expect(isDescendantOf('logs-app-default', 'logs-app.server.staging-default')).toBe(true);
    });

    it('should return false for invalid DSNS descendant streams', () => {
      expect(isDescendantOf('logs-app-default', 'logs-app-default-server')).toBe(false);
      expect(isDescendantOf('logs-app-default', 'logs-app-default-server')).toBe(false);
      expect(isDescendantOf('logs-app.server-default', 'logs-app.xxx-default')).toBe(false);
      expect(isDescendantOf('logs-app-default', 'logs-app-default')).toBe(false);
    });
  });

  describe('isChildOf', () => {
    it('should return true for valid child streams', () => {
      expect(isChildOf('logs.app', 'logs.app.server')).toBe(true);
      expect(isChildOf('logs.app.server', 'logs.app.server.prod')).toBe(true);
    });

    it('should return false for invalid child streams', () => {
      expect(isChildOf('metrics.app', 'logs.app.server')).toBe(false);
      expect(isChildOf('logs.app', 'logs.app')).toBe(false);
      expect(isChildOf('logs.app', 'logs.app.server.abc')).toBe(false);
      expect(isChildOf('logs.app', 'logs.app.server.abc.xyz')).toBe(false);
    });

    it('should return true for valid DSNS child streams', () => {
      expect(isChildOf('logs-app-default', 'logs-app.server-default')).toBe(true);
      expect(isChildOf('logs-app.server-default', 'logs-app.server.prod-default')).toBe(true);
      expect(isChildOf('logs-app-default', 'logs-app.server-default')).toBe(true);
    });

    it('should return false for invalid DSNS child streams', () => {
      expect(isChildOf('logs-app-default', 'logs-app-default-server')).toBe(false);
      expect(isChildOf('logs-app-default', 'logs-app-default')).toBe(false);
      expect(isChildOf('logs-app-default', 'logs-app.server.prod-default')).toBe(false);
      expect(isChildOf('logs-app-default', 'logs-app.server.prod.xyz-default')).toBe(false);
      expect(isChildOf('logs-app-default', 'logs-somethingelse.server-default')).toBe(false);
    });
  });

  describe('getParentId', () => {
    it('should return the correct parent id for a given stream', () => {
      expect(getParentId('logs.app.server.prod')).toBe('logs.app.server');
      expect(getParentId('logs.app.server')).toBe('logs.app');
      expect(getParentId('logs.app')).toBe('logs');
    });

    it('should return undefined for root streams', () => {
      expect(getParentId('logs')).toBeUndefined();
    });

    it('should return the correct parent id for a given DSNS stream', () => {
      expect(getParentId('logs-app.server-default')).toBe('logs-app-default');
      expect(getParentId('logs-app.server.prod-default')).toBe('logs-app.server-default');
    });

    it('should return undefined for DSNS root streams', () => {
      expect(getParentId('logs-app-default')).toBeUndefined();
    });

    it('should return undefined for unknown streams', () => {
      expect(getParentId('logs-abc-def-default')).toBeUndefined();
    });
  });

  describe('isWiredRoot', () => {
    it('should return true for wired root streams', () => {
      expect(isWiredRoot('logs')).toBe(true);
    });

    it('should return false for non-root streams', () => {
      expect(isWiredRoot('logs.app')).toBe(false);
      expect(isWiredRoot('logs-app-default')).toBe(false);
      expect(isWiredRoot('logs-app-default-xyz')).toBe(false);
    });
  });

  describe('getAncestors', () => {
    it('should return the correct ancestors for a given stream', () => {
      expect(getAncestors('logs.app.server')).toEqual(['logs', 'logs.app']);
      expect(getAncestors('logs.app.server.xyz')).toEqual(['logs', 'logs.app', 'logs.app.server']);
      expect(getAncestors('logs.app.server')).toEqual(['logs', 'logs.app']);
    });

    it('should return an empty array for root streams', () => {
      expect(getAncestors('logs')).toEqual([]);
    });

    it('should return the correct ancestors for a given DSNS stream', () => {
      expect(getAncestors('logs-app.server-default', 'logs-app-default')).toEqual([
        'logs-app-default',
      ]);
      expect(getAncestors('logs-app.server.xyz-default', 'logs-app-default')).toEqual([
        'logs-app.server-default',
        'logs-app-default',
      ]);
      expect(getAncestors('logs-app.server.xyz-default', 'logs-app.server-default')).toEqual([
        'logs-app.server-default',
      ]);
      expect(getAncestors('logs-app.server.abc.xyz-default', 'logs-app.server-default')).toEqual([
        'logs-app.server.abc-default',
        'logs-app.server-default',
      ]);
      expect(
        getAncestors('logs-app.server.abc.xyz-default', 'logs-app.server.abc-default')
      ).toEqual(['logs-app.server.abc-default']);
      expect(
        getAncestors('logs-app.server.abc.xyz.ddd-default', 'logs-app.server.abc-default')
      ).toEqual(['logs-app.server.abc.xyz-default', 'logs-app.server.abc-default']);
    });

    it('should return an empty array for DSNS root streams', () => {
      expect(getAncestors('logs-app-default')).toEqual([]);
    });
  });
});
