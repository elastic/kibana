/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '.';
import { Feature } from '../../../../xpack_main/types';
import { disableUICapabilitesFactory } from './disable_ui_capabilities';

interface MockServerOptions {
  checkPrivileges: {
    reject?: any;
    resolve?: any;
  };
  features: Feature[];
}

const actions = new Actions('1.0.0-zeta1');
const mockRequest = {
  foo: Symbol(),
};

const createMockServer = (options: MockServerOptions) => {
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

  const mockXPackMainPlugin = {
    getFeatures: jest.fn().mockReturnValue(options.features),
  };

  return {
    log: jest.fn(),
    plugins: {
      security: {
        authorization: mockAuthorizationService,
      },
      xpack_main: mockXPackMainPlugin,
    },
  };
};

describe('usingPrivileges', () => {
  describe('checkPrivileges errors', () => {
    test(`disables uiCapabilities when a 401 is thrown`, async () => {
      const mockServer = createMockServer({
        checkPrivileges: {
          reject: {
            statusCode: 401,
            message: 'super informative message',
          },
        },
        features: [
          {
            id: 'fooFeature',
            name: 'Foo Feature',
            app: [],
            navLinkId: 'foo',
            privileges: {},
          },
        ],
      });
      const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
      const result = await usingPrivileges(
        Object.freeze({
          navLinks: {
            foo: true,
            bar: true,
          },
          management: {
            kibana: {
              indices: true,
            },
          },
          catalogue: {},
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
          bar: true,
        },
        management: {
          kibana: {
            indices: false,
          },
        },
        catalogue: {},
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      });

      expect(mockServer.log).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        "security",
        "debug",
      ],
      "Disabling all uiCapabilities because we received a 401: super informative message",
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": undefined,
    },
  ],
}
`);
    });

    test(`disables uiCapabilities when a 403 is thrown`, async () => {
      const mockServer = createMockServer({
        checkPrivileges: {
          reject: {
            statusCode: 403,
            message: 'even more super informative message',
          },
        },
        features: [
          {
            id: 'fooFeature',
            name: 'Foo Feature',
            navLinkId: 'foo',
            app: [],
            privileges: {},
          },
        ],
      });
      const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
      const result = await usingPrivileges(
        Object.freeze({
          navLinks: {
            foo: true,
            bar: true,
          },
          management: {
            kibana: {
              indices: true,
            },
          },
          catalogue: {},
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
          bar: true,
        },
        management: {
          kibana: {
            indices: false,
          },
        },
        catalogue: {},
        fooFeature: {
          foo: false,
          bar: false,
        },
        barFeature: {
          foo: false,
          bar: false,
        },
      });
      expect(mockServer.log).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Array [
        "security",
        "debug",
      ],
      "Disabling all uiCapabilities because we received a 403: even more super informative message",
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": undefined,
    },
  ],
}
`);
    });

    test(`otherwise it throws the error`, async () => {
      const mockServer = createMockServer({
        checkPrivileges: {
          reject: new Error('something else entirely'),
        },
        features: [],
      });
      const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
      await expect(
        usingPrivileges({
          navLinks: {
            foo: true,
            bar: false,
          },
          management: {
            kibana: {
              indices: true,
            },
          },
          catalogue: {},
        })
      ).rejects.toThrowErrorMatchingSnapshot();
      expect(mockServer.log).not.toHaveBeenCalled();
    });
  });

  test(`disables ui capabilities when they don't have privileges`, async () => {
    const mockServer = createMockServer({
      checkPrivileges: {
        resolve: {
          privileges: {
            [actions.ui.get('navLinks', 'foo')]: true,
            [actions.ui.get('navLinks', 'bar')]: false,
            [actions.ui.get('navLinks', 'quz')]: false,
            [actions.ui.get('management', 'kibana', 'indices')]: true,
            [actions.ui.get('management', 'kibana', 'settings')]: false,
            [actions.ui.get('fooFeature', 'foo')]: true,
            [actions.ui.get('fooFeature', 'bar')]: false,
            [actions.ui.get('barFeature', 'foo')]: true,
            [actions.ui.get('barFeature', 'bar')]: false,
          },
        },
      },
      features: [
        {
          id: 'fooFeature',
          name: 'Foo Feature',
          navLinkId: 'foo',
          app: [],
          privileges: {},
        },
        {
          id: 'barFeature',
          name: 'Bar Feature',
          navLinkId: 'bar',
          app: [],
          privileges: {},
        },
      ],
    });
    const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
    const result = await usingPrivileges(
      Object.freeze({
        navLinks: {
          foo: true,
          bar: true,
          quz: true,
        },
        management: {
          kibana: {
            indices: true,
            settings: false,
          },
        },
        catalogue: {},
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
        quz: true,
      },
      management: {
        kibana: {
          indices: true,
          settings: false,
        },
      },
      catalogue: {},
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
            [actions.ui.get('management', 'kibana', 'indices')]: true,
            [actions.ui.get('fooFeature', 'foo')]: true,
            [actions.ui.get('fooFeature', 'bar')]: true,
            [actions.ui.get('barFeature', 'foo')]: true,
            [actions.ui.get('barFeature', 'bar')]: true,
          },
        },
      },
      features: [
        {
          id: 'fooFeature',
          name: 'Foo Feature',
          navLinkId: 'foo',
          app: [],
          privileges: {},
        },
        {
          id: 'barFeature',
          name: 'Bar Feature',
          navLinkId: 'bar',
          app: [],
          privileges: {},
        },
      ],
    });
    const { usingPrivileges } = disableUICapabilitesFactory(mockServer, mockRequest);
    const result = await usingPrivileges(
      Object.freeze({
        navLinks: {
          foo: false,
          bar: false,
        },
        management: {
          kibana: {
            indices: false,
          },
        },
        catalogue: {},
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
      management: {
        kibana: {
          indices: false,
        },
      },
      catalogue: {},
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
  test(`disables uiCapabilities`, () => {
    const mockServer = createMockServer({
      checkPrivileges: {
        reject: new Error(`Don't use me`),
      },
      features: [
        {
          id: 'fooFeature',
          name: 'Foo Feature',
          navLinkId: 'foo',
          app: [],
          privileges: {},
        },
      ],
    });
    const { all } = disableUICapabilitesFactory(mockServer, mockRequest);
    const result = all(
      Object.freeze({
        navLinks: {
          foo: true,
          bar: true,
        },
        management: {
          kibana: {
            indices: true,
          },
        },
        catalogue: {},
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
        bar: true,
      },
      management: {
        kibana: {
          indices: false,
        },
      },
      catalogue: {},
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
