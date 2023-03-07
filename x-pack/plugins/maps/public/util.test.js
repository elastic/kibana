/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGlyphUrl,
  makePublicExecutionContext,
  testOnlyClearCanAccessEmsFontsPromise,
} from './util';

jest.mock('./kibana_services', () => ({
  getDocLinks: () => {
    return {
      links: {
        maps: {
          connectToEms: 'https://www.elastic.co/guide/en/kibana/current/maps-connect-to-ems.html',
        },
      },
    };
  },
}));

describe('getGlyphUrl', () => {
  describe('EMS enabled', () => {
    beforeEach(() => {
      require('./kibana_services').getHttp = () => ({
        basePath: {
          prepend: (path) => `abc${path}`,
        },
      });
      testOnlyClearCanAccessEmsFontsPromise();
    });

    describe('offline', () => {
      beforeAll(() => {
        require('./kibana_services').getEMSSettings = () => {
          return {
            getEMSFontLibraryUrl() {
              return 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf';
            },
            isEMSEnabled() {
              return true;
            },
          };
        };
        require('node-fetch').default = () => {
          throw new Error('Simulated offline environment with no EMS access');
        };
      });

      test('should return kibana fonts template URL', async () => {
        expect(await getGlyphUrl()).toBe('abc/api/maps/fonts/{fontstack}/{range}');
      });
    });

    describe('online', () => {
      beforeAll(() => {
        require('./kibana_services').getEMSSettings = () => {
          return {
            getEMSFontLibraryUrl() {
              return 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf';
            },
            isEMSEnabled() {
              return true;
            },
          };
        };
        require('node-fetch').default = () => {
          return Promise.resolve({ status: 200 });
        };
      });

      test('should return EMS fonts template URL', async () => {
        expect(await getGlyphUrl()).toBe(
          'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf'
        );
      });
    });
  });

  describe('EMS disabled', () => {
    beforeAll(() => {
      require('./kibana_services').getHttp = () => {
        return {
          basePath: {
            prepend: (path) => `abc${path}`,
          },
        };
      };
      require('./kibana_services').getEMSSettings = () => {
        return {
          isEMSEnabled: () => false,
        };
      };
    });

    test('should return kibana fonts template URL', async () => {
      expect(await getGlyphUrl()).toBe('abc/api/maps/fonts/{fontstack}/{range}');
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
