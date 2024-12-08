/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService } from './routes';

describe('Route services', () => {
  describe('epmRouteService', () => {
    describe('getInfoPath', () => {
      it('should generate path with pkgVersion', () => {
        expect(epmRouteService.getInfoPath('test', '1.0.0')).toBe(
          '/api/fleet/epm/packages/test/1.0.0'
        );
      });
      it('should generate path without pkgVersion', () => {
        expect(epmRouteService.getInfoPath('test')).toBe('/api/fleet/epm/packages/test');
      });
    });
    describe('getInstallPath', () => {
      it('should generate path with pkgVersion', () => {
        expect(epmRouteService.getInstallPath('test', '1.0.0')).toBe(
          '/api/fleet/epm/packages/test/1.0.0'
        );
      });
      it('should generate path without pkgVersion', () => {
        expect(epmRouteService.getInstallPath('test')).toBe('/api/fleet/epm/packages/test');
      });
    });
    describe('getRemovePath', () => {
      it('should generate path with pkgVersion', () => {
        expect(epmRouteService.getRemovePath('test', '1.0.0')).toBe(
          '/api/fleet/epm/packages/test/1.0.0'
        );
      });
      it('should generate path without pkgVersion', () => {
        expect(epmRouteService.getRemovePath('test')).toBe('/api/fleet/epm/packages/test');
      });
    });
  });
});
