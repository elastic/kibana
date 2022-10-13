/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGlyphUrl, makePublicExecutionContext } from './util';

const MOCK_EMS_SETTINGS = {
  isEMSEnabled: () => true,
};

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

describe('makePublicExecutionContext', () => {
  let injectedContext = {};
  beforeAll(() => {
    require('./kibana_services').getExecutionContext = () => ({
      get: () => injectedContext,
    });
  });

  test('creates basic context when no top level context is provided', () => {
    const context = makePublicExecutionContext('test');
    expect(context).toStrictEqual({
      description: 'test',
      name: 'maps',
      type: 'application',
      url: '/',
    });
  });

  test('merges with top level context if its from the same app', () => {
    injectedContext = {
      name: 'maps',
      id: '1234',
    };
    const context = makePublicExecutionContext('test');
    expect(context).toStrictEqual({
      description: 'test',
      name: 'maps',
      type: 'application',
      url: '/',
      id: '1234',
    });
  });

  test('nests inside top level context if its from a different app', () => {
    injectedContext = {
      name: 'other-app',
      id: '1234',
    };
    const context = makePublicExecutionContext('test');
    expect(context).toStrictEqual({
      name: 'other-app',
      id: '1234',
      child: {
        description: 'test',
        type: 'application',
        name: 'maps',
        url: '/',
      },
    });
  });
});
