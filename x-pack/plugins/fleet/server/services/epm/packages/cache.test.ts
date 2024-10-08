/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPackageAssetsMapCache,
  getPackageInfoCache,
  runWithCache,
  setPackageAssetsMapCache,
  setPackageInfoCache,
} from './cache';

const PKG_NAME = 'test';
const PKG_VERSION = '1.0.0';

describe('EPM CacheSession', () => {
  describe('outside of a cache session', () => {
    it('should not cache package info', () => {
      setPackageInfoCache(PKG_NAME, PKG_VERSION, {
        name: 'test',
      } as any);
      const cache = getPackageInfoCache(PKG_NAME, PKG_VERSION);
      expect(cache).toBeUndefined();
    });

    it('should not cache assetsMap', () => {
      setPackageAssetsMapCache(PKG_NAME, PKG_VERSION, new Map());
      const cache = getPackageAssetsMapCache(PKG_NAME, PKG_VERSION);
      expect(cache).toBeUndefined();
    });
  });

  describe('in of a cache session', () => {
    it('should cache package info', async () => {
      function setCache() {
        setPackageInfoCache(PKG_NAME, PKG_VERSION, {
          name: 'test',
        } as any);
      }
      function getCache() {
        const cache = getPackageInfoCache(PKG_NAME, PKG_VERSION);
        expect(cache).toEqual({ name: 'test' });
      }

      await runWithCache(async () => {
        setCache();
        getCache();
      });
    });

    it('should cache assetsMap', async () => {
      function setCache() {
        const map = new Map();
        map.set('test.yaml', Buffer.from('name: test'));
        setPackageAssetsMapCache(PKG_NAME, PKG_VERSION, map);
      }
      function getCache() {
        const cache = getPackageAssetsMapCache(PKG_NAME, PKG_VERSION);
        expect(cache).not.toBeUndefined();
        expect(cache?.get('test.yaml')?.toString()).toEqual('name: test');
      }

      await runWithCache(async () => {
        setCache();
        getCache();
      });
    });
  });
});
