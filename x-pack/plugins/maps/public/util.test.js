/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMSClient } from '@elastic/ems-client';
import { getEMSClient, getGlyphUrl } from './util';

jest.mock('@elastic/ems-client');

const EMS_FONTS_URL_MOCK = 'ems/fonts';
const MOCK_EMS_SETTINGS = {
  isEMSEnabled: () => true,
  getEMSFileApiUrl: () => 'https://file-api',
  getEMSTileApiUrl: () => 'https://tile-api',
  getEMSLandingPageUrl: () => 'http://test.com',
  getEMSFontLibraryUrl: () => EMS_FONTS_URL_MOCK,
  isProxyElasticMapsServiceInMaps: () => false,
};

describe('default use without proxy', () => {
  beforeEach(() => {
    require('./kibana_services').getEmsTileLayerId = () => '123';
    require('./kibana_services').getEMSSettings = () => {
      return MOCK_EMS_SETTINGS;
    };
    require('./licensed_features').getLicenseId = () => {
      return 'foobarlicenseid';
    };
  });

  test('should construct EMSClient with absolute file and tile API urls', async () => {
    getEMSClient();
    const mockEmsClientCall = EMSClient.mock.calls[0];
    expect(mockEmsClientCall[0].fileApiUrl.startsWith('https://file-api')).toBe(true);
    expect(mockEmsClientCall[0].tileApiUrl.startsWith('https://tile-api')).toBe(true);
  });
});

describe('getGlyphUrl', () => {
  describe('EMS enabled', () => {
    beforeAll(() => {
      require('./kibana_services').getHttp = () => ({
        basePath: {
          prepend: (url) => url, // No need to actually prepend a dev basepath for test
        },
      });
    });

    describe('EMS proxy enabled', () => {
      beforeAll(() => {
        require('./kibana_services').getEMSSettings = () => {
          return {
            ...MOCK_EMS_SETTINGS,
            isProxyElasticMapsServiceInMaps: () => true,
          };
        };
      });

      test('should return proxied EMS fonts URL', async () => {
        expect(getGlyphUrl()).toBe('http://localhost/api/maps/ems/tiles/fonts/{fontstack}/{range}');
      });
    });

    describe('EMS proxy disabled', () => {
      beforeAll(() => {
        require('./kibana_services').getEMSSettings = () => {
          return {
            ...MOCK_EMS_SETTINGS,
            isProxyElasticMapsServiceInMaps: () => false,
          };
        };
      });

      test('should return EMS fonts URL', async () => {
        expect(getGlyphUrl()).toBe(EMS_FONTS_URL_MOCK);
      });
    });
  });

  describe('EMS disabled', () => {
    beforeAll(() => {
      const mockHttp = {
        basePath: {
          prepend: (path) => `abc${path}`,
        },
      };
      require('./kibana_services').getHttp = () => mockHttp;
      require('./kibana_services').getEMSSettings = () => {
        return {
          ...MOCK_EMS_SETTINGS,
          isEMSEnabled: () => false,
        };
      };
    });

    test('should return kibana fonts URL', async () => {
      expect(getGlyphUrl()).toBe('abc/api/maps/fonts/{fontstack}/{range}');
    });
  });
});
