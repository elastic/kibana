/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAssetCriticalityService } from './asset_criticality_service';

describe('AssetCriticalityService', () => {
  describe('#getCriticalitiesByIdentifier()', () => {
    it('returns an empty response if identifier is not found', async () => {
      const service = createAssetCriticalityService();
      const result = await service.getCriticalitiesByIdentifier({ 'host.name': 'not-found' });
      expect(result).toEqual([]);
    });

    it('returns a single criticality if identifier is found', async () => {
      const service = createAssetCriticalityService();
      const result = await service.getCriticalitiesByIdentifier({ 'host.name': 'found' });
      expect(result).toEqual(['critical']);
    });

    it('returns multiple criticalities if identifier has multiple valid values', async () => {
      const service = createAssetCriticalityService();
      const result = await service.getCriticalitiesByIdentifier({
        'host.name': ['found', 'also-found'],
      });

      expect(result).toEqual(['critical', 'high']);
    });

    describe('arguments', () => {
      it('accepts a single identifier value as a string', async () => {
        const service = createAssetCriticalityService();
        expect(() => service.getCriticalitiesByIdentifier({ 'host.name': 'foo' })).not.toThrow();
      });

      it('accepts a single identifier value as an array', async () => {
        const service = createAssetCriticalityService();
        expect(() => service.getCriticalitiesByIdentifier({ 'host.name': ['foo'] })).not.toThrow();
      });

      it('accepts multiple identifiers', async () => {
        const service = createAssetCriticalityService();
        expect(() =>
          service.getCriticalitiesByIdentifier({ 'host.name': ['foo'], 'user.name': 'bar' })
        ).not.toThrow();
      });

      it('throws an error if no identifiers are provided', async () => {
        const service = createAssetCriticalityService();
        await expect(() => service.getCriticalitiesByIdentifier({})).rejects.toThrowError(
          'At least one identifier must be provided'
        );
      });

      it('throws an error if no identifier values are provided', async () => {
        const service = createAssetCriticalityService();
        await expect(() =>
          service.getCriticalitiesByIdentifier({ 'host.name': [] })
        ).rejects.toThrowError('At least one identifier must contain a value');
      });
    });
  });
});
