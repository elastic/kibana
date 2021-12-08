/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEMSClient, getGlyphUrl } from './util';

const MOCK_EMS_SETTINGS = {
  isEMSEnabled: () => true,
};

describe('default ems-client creation', () => {
  beforeEach(() => {
    require('./kibana_services').getEmsTileLayerId = () => '123';
    require('./kibana_services').getEMSSettings = () => {
      return MOCK_EMS_SETTINGS;
    };
    require('./kibana_services').getMapsEmsSetup = () => {
      return {
        createEMSClient() {
          return {
            addQueryParams: () => {},
          };
        },
      };
    };
    require('./licensed_features').getLicenseId = () => {
      return 'foobarlicenseid';
    };
  });

  test('should memoize EMSClient', async () => {
    const client1 = getEMSClient();
    const client2 = getEMSClient();
    expect(client1 === client2).toBe(true);
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

    describe('EMS proxy disabled', () => {
      beforeAll(() => {
        require('./kibana_services').getEMSSettings = () => {
          return {
            getEMSFontLibraryUrl() {
              return 'foobar';
            },
            isEMSEnabled() {
              return true;
            },
          };
        };
      });

      test('should return EMS fonts URL', async () => {
        expect(getGlyphUrl()).toBe('foobar');
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
