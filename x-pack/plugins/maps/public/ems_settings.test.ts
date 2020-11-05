/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSSettings, IEMSConfig } from './ems_settings';
import {
  DEFAULT_EMS_FILE_API_URL,
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
} from '../../../../src/plugins/maps_legacy/common';

describe('EMSSettings', () => {
  const mockConfig: IEMSConfig = {
    includeElasticMapsService: true,
    proxyElasticMapsServiceInMaps: false,
    emsUrl: '',
    emsFileApiUrl: DEFAULT_EMS_FILE_API_URL,
    emsTileApiUrl: DEFAULT_EMS_TILE_API_URL,
    emsLandingPageUrl: DEFAULT_EMS_LANDING_PAGE_URL,
    emsFontLibraryUrl: DEFAULT_EMS_FONT_LIBRARY_URL,
    isEMSEnabled: true,
  };

  describe('isConfigValid', () => {
    test('should validate defaults', () => {
      const emsSettings = new EMSSettings(mockConfig);
      expect(emsSettings.isConfigValid()).toBe(true);
    });

    test('should not validate if ems turned off', () => {
      const emsSettings = new EMSSettings({
        ...mockConfig,
        ...{
          emsUrl: 'https://localhost:8080',
          includeElasticMapsService: false,
        },
      });
      expect(emsSettings.isConfigValid()).toBe(false);
    });

    test('should not validate if proxying is turned on', () => {
      const emsSettings = new EMSSettings({
        ...mockConfig,
        ...{
          emsUrl: 'https://localhost:8080',
          proxyElasticMapsServiceInMaps: true,
        },
      });
      expect(emsSettings.isConfigValid()).toBe(false);
    });
  });

  describe('emsUrl setting', () => {
    describe('when emsUrl is not set', () => {
      test('should respect defaults', () => {
        const emsSettings = new EMSSettings(mockConfig);
        expect(emsSettings.getEMSFileApiUrl()).toBe(DEFAULT_EMS_FILE_API_URL);
        expect(emsSettings.getEMSTileApiUrl()).toBe(DEFAULT_EMS_TILE_API_URL);
        expect(emsSettings.getEMSFontLibraryUrl()).toBe(DEFAULT_EMS_FONT_LIBRARY_URL);
        expect(emsSettings.getEMSLandingPageUrl()).toBe(DEFAULT_EMS_LANDING_PAGE_URL);
      });
      test('should apply overrides', () => {
        const emsSettings = new EMSSettings({
          ...mockConfig,
          ...{
            emsFileApiUrl: 'https://file.foobar',
            emsTileApiUrl: 'https://tile.foobar',
            emsFontLibraryUrl: 'https://tile.foobar/font',
            emsLandingPageUrl: 'https://maps.foobar/v7.666',
          },
        });
        expect(emsSettings.getEMSFileApiUrl()).toBe('https://file.foobar');
        expect(emsSettings.getEMSTileApiUrl()).toBe('https://tile.foobar');
        expect(emsSettings.getEMSFontLibraryUrl()).toBe('https://tile.foobar/font');
        expect(emsSettings.getEMSLandingPageUrl()).toBe('https://maps.foobar/v7.666');
      });
    });

    describe('when emsUrl is set', () => {
      test('should override defaults', () => {
        const emsSettings = new EMSSettings({
          ...mockConfig,
          ...{
            emsUrl: 'https://localhost:8080',
          },
        });
        expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
        expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
        expect(emsSettings.getEMSFontLibraryUrl()).toBe(
          'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
        );
        expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
      });

      describe('internal settings overrides (the below behavior is not publically supported, but aids internal debugging use-cases)', () => {
        test(`should override internal emsFileApiUrl`, () => {
          const emsSettings = new EMSSettings({
            ...mockConfig,
            ...{
              emsUrl: 'https://localhost:8080',
              emsFileApiUrl: 'https://file.foobar',
            },
          });
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://file.foobar');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe(
            'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
          );
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
        });

        test(`should override internal emsTileApiUrl`, () => {
          const emsSettings = new EMSSettings({
            ...mockConfig,
            ...{
              emsUrl: 'https://localhost:8080',
              emsTileApiUrl: 'https://tile.foobar',
            },
          });
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://tile.foobar');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe(
            'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
          );
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
        });

        test('should override internal emsFontLibraryUrl', () => {
          const emsSettings = new EMSSettings({
            ...mockConfig,
            ...{
              emsUrl: 'https://localhost:8080',
              emsFontLibraryUrl: 'https://maps.foobar/fonts',
            },
          });
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe('https://maps.foobar/fonts');
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://localhost:8080/maps');
        });

        test('should override internal emsLandingPageUrl', () => {
          const emsSettings = new EMSSettings({
            ...mockConfig,
            ...{
              emsUrl: 'https://localhost:8080',
              emsLandingPageUrl: 'https://maps.foobar',
            },
          });
          expect(emsSettings.getEMSFileApiUrl()).toBe('https://localhost:8080/file');
          expect(emsSettings.getEMSTileApiUrl()).toBe('https://localhost:8080/tile');
          expect(emsSettings.getEMSFontLibraryUrl()).toBe(
            'https://localhost:8080/tile/fonts/{fontstack}/{range}.pbf'
          );
          expect(emsSettings.getEMSLandingPageUrl()).toBe('https://maps.foobar');
        });
      });
    });
  });
});
