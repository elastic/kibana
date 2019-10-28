/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '.';
import { disableUICapabilitiesFactory } from './disable_ui_capabilities';

import { httpServerMock, loggingServiceMock } from '../../../../../src/core/server/mocks';
import { authorizationMock } from './index.mock';

type MockAuthzOptions = { rejectCheckPrivileges: any } | { resolveCheckPrivileges: any };

const actions = new Actions('1.0.0-zeta1');
const mockRequest = httpServerMock.createKibanaRequest();

const createMockAuthz = (options: MockAuthzOptions) => {
  const mock = authorizationMock.create({ version: '1.0.0-zeta1' });
  mock.checkPrivilegesDynamicallyWithRequest.mockImplementation(request => {
    expect(request).toBe(mockRequest);

    return jest.fn().mockImplementation(checkActions => {
      if ('rejectCheckPrivileges' in options) {
        throw options.rejectCheckPrivileges;
      }

      expect(checkActions).toEqual(Object.keys(options.resolveCheckPrivileges.privileges));
      return options.resolveCheckPrivileges;
    });
  });
  return mock;
};

describe('usingPrivileges', () => {
  describe('checkPrivileges errors', () => {
    test(`disables uiCapabilities when a 401 is thrown`, async () => {
      const mockAuthz = createMockAuthz({
        rejectCheckPrivileges: { statusCode: 401, message: 'super informative message' },
      });
      const mockLoggers = loggingServiceMock.create();

      const { usingPrivileges } = disableUICapabilitiesFactory(
        mockRequest,
        [{ id: 'fooFeature', name: 'Foo Feature', app: [], navLinkId: 'foo', privileges: {} }],
        mockLoggers.get(),
        mockAuthz
      );

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

      expect(loggingServiceMock.collect(mockLoggers).debug).toMatchInlineSnapshot(`
        Array [
          Array [
            "Disabling all uiCapabilities because we received a 401: super informative message",
          ],
        ]
      `);
    });

    test(`disables uiCapabilities when a 403 is thrown`, async () => {
      const mockAuthz = createMockAuthz({
        rejectCheckPrivileges: { statusCode: 403, message: 'even more super informative message' },
      });
      const mockLoggers = loggingServiceMock.create();

      const { usingPrivileges } = disableUICapabilitiesFactory(
        mockRequest,
        [{ id: 'fooFeature', name: 'Foo Feature', app: [], navLinkId: 'foo', privileges: {} }],
        mockLoggers.get(),
        mockAuthz
      );

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
      expect(loggingServiceMock.collect(mockLoggers).debug).toMatchInlineSnapshot(`
        Array [
          Array [
            "Disabling all uiCapabilities because we received a 403: even more super informative message",
          ],
        ]
      `);
    });

    test(`otherwise it throws the error`, async () => {
      const mockAuthz = createMockAuthz({
        rejectCheckPrivileges: new Error('something else entirely'),
      });
      const mockLoggers = loggingServiceMock.create();

      const { usingPrivileges } = disableUICapabilitiesFactory(
        mockRequest,
        [],
        mockLoggers.get(),
        mockAuthz
      );

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
      expect(loggingServiceMock.collect(mockLoggers)).toMatchInlineSnapshot(`
        Object {
          "debug": Array [],
          "error": Array [],
          "fatal": Array [],
          "info": Array [],
          "log": Array [],
          "trace": Array [],
          "warn": Array [],
        }
      `);
    });
  });

  test(`disables ui capabilities when they don't have privileges`, async () => {
    const mockAuthz = createMockAuthz({
      resolveCheckPrivileges: {
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
    });

    const { usingPrivileges } = disableUICapabilitiesFactory(
      mockRequest,
      [
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
      loggingServiceMock.create().get(),
      mockAuthz
    );

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
    const mockAuthz = createMockAuthz({
      resolveCheckPrivileges: {
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
    });

    const { usingPrivileges } = disableUICapabilitiesFactory(
      mockRequest,
      [
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
      loggingServiceMock.create().get(),
      mockAuthz
    );

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
    const mockAuthz = createMockAuthz({ rejectCheckPrivileges: new Error(`Don't use me`) });

    const { all } = disableUICapabilitiesFactory(
      mockRequest,
      [{ id: 'fooFeature', name: 'Foo Feature', app: [], navLinkId: 'foo', privileges: {} }],
      loggingServiceMock.create().get(),
      mockAuthz
    );

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
