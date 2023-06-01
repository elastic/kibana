/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGlyphs, getCanAccessEmsFonts, testOnlyClearCanAccessEmsFontsPromise } from './glyphs';

jest.mock('../../kibana_services', () => ({
  getHttp: () => {
    return {
      basePath: {
        prepend: (path: string) => `abc${path}`,
      },
    };
  },
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

describe('EMS enabled', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../kibana_services').getEMSSettings = () => {
      return {
        getEMSFontLibraryUrl: () => {
          return 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf';
        },
        isEMSEnabled() {
          return true;
        },
      };
    };
    testOnlyClearCanAccessEmsFontsPromise();
  });

  describe('offline', () => {
    beforeAll(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('node-fetch').default = () => {
        throw new Error('Simulated offline environment with no EMS access');
      };
    });

    test('should return EMS fonts template URL before canAccessEmsFontsPromise resolves', () => {
      expect(getGlyphs()).toEqual({
        isEmsFont: true,
        glyphUrlTemplate: 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf',
      });
    });

    test('should return kibana fonts template URL after canAccessEmsFontsPromise resolves with failure', async () => {
      await getCanAccessEmsFonts();
      expect(getGlyphs()).toEqual({
        isEmsFont: false,
        glyphUrlTemplate: 'abc/internal/maps/fonts/{fontstack}/{range}',
      });
    });
  });

  describe('online', () => {
    beforeAll(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('node-fetch').default = () => {
        return Promise.resolve({ status: 200 });
      };
    });

    test('should return EMS fonts template URL before canAccessEmsFontsPromise resolves', () => {
      expect(getGlyphs()).toEqual({
        isEmsFont: true,
        glyphUrlTemplate: 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf',
      });
    });

    test('should return EMS fonts template URL after canAccessEmsFontsPromise resolves', async () => {
      await getCanAccessEmsFonts();
      expect(getGlyphs()).toEqual({
        isEmsFont: true,
        glyphUrlTemplate: 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf',
      });
    });
  });
});

describe('EMS disabled', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../kibana_services').getEMSSettings = () => {
      return {
        getEMSFontLibraryUrl: () => {
          return 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf';
        },
        isEMSEnabled: () => false,
      };
    };
    testOnlyClearCanAccessEmsFontsPromise();
  });

  test('should return kibana fonts template URL before canAccessEmsFontsPromise resolves', () => {
    expect(getGlyphs()).toEqual({
      isEmsFont: false,
      glyphUrlTemplate: 'abc/internal/maps/fonts/{fontstack}/{range}',
    });
  });

  test('should return kibana fonts template URL after canAccessEmsFontsPromise resolves', async () => {
    await getCanAccessEmsFonts();
    expect(getGlyphs()).toEqual({
      isEmsFont: false,
      glyphUrlTemplate: 'abc/internal/maps/fonts/{fontstack}/{range}',
    });
  });
});
