/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '.';
import { disableUICapabilitesFactory } from './disable_ui_capabilities';

interface MockServerOptions {
  checkPrivileges: {
    reject?: any;
    resolve?: any;
  };
}

const actions = new Actions('1.0.0-zeta1');
const mockRequest = Symbol();

const createMockServer = (options: MockServerOptions) => {
  const mockSpacesPlugin = {
    getSpaceId: () => 'foo',
  };

  const mockAuthorizationService = {
    actions,
    checkPrivilegesDynamicallyWithRequest(request: any) {
      expect(request).toBe(mockRequest);

      return jest.fn().mockImplementation(checkActions => {
        if (options.checkPrivileges.reject) {
          throw options.checkPrivileges.reject;
        }

        if (options.checkPrivileges.resolve) {
          expect(checkActions).toEqual(Object.keys(options.checkPrivileges.resolve.privileges));
          return options.checkPrivileges.resolve;
        }

        throw new Error('resolve or reject should have been provided');
      });
    },
  };

  return {
    plugins: {
      spaces: mockSpacesPlugin,
      security: {
        authorization: mockAuthorizationService,
      },
    },
  };
};

describe('usingPrivileges', () => {
  describe('checkPrivileges errors', () => {
    test(`disables all uiCapabilities when a 401 is thrown`, async () => {
      const mockServer = createMockServer({
        checkPrivileges: {
          reject: {
            statusCode: 401,
          },
        },
      });
      const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
      const result = await usingPrivileges(
        Object.freeze({
          navLinks: {
            foo: true,
            bar: true,
          },
          fooFeature: {
            foo: true,
            bar: true,
          },
          barFeature: {
            foo: true,
            bar: true,
          },
        })
      );

      expect(result).toEqual({
        navLinks: {
          foo: false,
          bar: false,
        },
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      });
    });

    test(`disables all uiCapabilities when a 403 is thrown`, async () => {
      const mockServer = createMockServer({
        checkPrivileges: {
          reject: {
            statusCode: 403,
          },
        },
      });
      const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
      const result = await usingPrivileges(
        Object.freeze({
          navLinks: {
            foo: true,
            bar: true,
          },
          fooFeature: {
            foo: true,
            bar: true,
          },
          barFeature: {
            foo: true,
            bar: true,
          },
        })
      );

      expect(result).toEqual({
        navLinks: {
          foo: false,
          bar: false,
        },
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      });
    });

    test(`otherwise it throws the error`, async () => {
      const mockServer = createMockServer({
        checkPrivileges: {
          reject: new Error('something else entirely'),
        },
      });
      const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
      await expect(
        usingPrivileges({
          navLinks: {
            foo: true,
            bar: false,
          },
        })
      ).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  test(`disables ui capabilities when they don't have privileges`, async () => {
    const mockServer = createMockServer({
      checkPrivileges: {
        resolve: {
          privileges: {
            [actions.ui.get('navLinks', 'foo')]: true,
            [actions.ui.get('navLinks', 'bar')]: false,
            [actions.ui.get('fooFeature', 'foo')]: true,
            [actions.ui.get('fooFeature', 'bar')]: false,
            [actions.ui.get('barFeature', 'foo')]: true,
            [actions.ui.get('barFeature', 'bar')]: false,
          },
        },
      },
    });
    const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
    const result = await usingPrivileges(
      Object.freeze({
        navLinks: {
          foo: true,
          bar: true,
        },
        fooFeature: {
          foo: true,
          bar: true,
        },
        barFeature: {
          foo: true,
          bar: true,
        },
      })
    );

    expect(result).toEqual({
      navLinks: {
        foo: true,
        bar: false,
      },
      fooFeature: {
        foo: true,
        bar: false,
      },
      barFeature: {
        foo: true,
        bar: false,
      },
    });
  });

  test(`doesn't re-enable disabled uiCapabilities`, async () => {
    const mockServer = createMockServer({
      checkPrivileges: {
        resolve: {
          privileges: {
            [actions.ui.get('navLinks', 'foo')]: true,
            [actions.ui.get('navLinks', 'bar')]: true,
            [actions.ui.get('fooFeature', 'foo')]: true,
            [actions.ui.get('fooFeature', 'bar')]: true,
            [actions.ui.get('barFeature', 'foo')]: true,
            [actions.ui.get('barFeature', 'bar')]: true,
          },
        },
      },
    });
    const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
    const result = await usingPrivileges(
      Object.freeze({
        navLinks: {
          foo: false,
          bar: false,
        },
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      })
    );

    expect(result).toEqual({
      navLinks: {
        foo: false,
        bar: false,
      },
      fooFeature: {
        foo: false,
        bar: false,
      },
      barFeature: {
        foo: false,
        bar: false,
      },
    });
  });
});

describe('all', () => {
  test(`disables all uiCapabilities`, () => {
    const mockServer = createMockServer({
      checkPrivileges: {
        reject: new Error(`Don't use me`),
      },
    });
    const { all } = disableUICapabilitesFactory(mockServer, mockRequest);
    const result = all(
      Object.freeze({
        navLinks: {
          foo: true,
          bar: true,
        },
        fooFeature: {
          foo: true,
          bar: true,
        },
        barFeature: {
          foo: true,
          bar: true,
        },
      })
    );
    expect(result).toEqual({
      navLinks: {
        foo: false,
        bar: false,
      },
      fooFeature: {
        foo: false,
        bar: false,
      },
      barFeature: {
        foo: false,
        bar: false,
      },
    });
  });
});
