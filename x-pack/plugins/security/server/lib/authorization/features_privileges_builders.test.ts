/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../../xpack_main/types';
import { Actions } from './actions';
import { FeaturesPrivilegesBuilder } from './features_privileges_builder';

const versionNumber = '1.0.0-zeta1';

describe('#buildFeaturesPrivileges', () => {
  test('specifies key for each feature', () => {
    const builder = new FeaturesPrivilegesBuilder(new Actions(versionNumber));
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {},
      },
      {
        id: 'bar',
        name: '',
        privileges: {},
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: expect.anything(),
      bar: expect.anything(),
    });
  });

  test('always includes login and version action', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: {
        bar: [actions.login, actions.version],
      },
    });
  });

  test('includes api actions when specified', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            api: ['foo/operation', 'bar/operation'],
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: {
        bar: [
          actions.login,
          actions.version,
          actions.api.get('foo/operation'),
          actions.api.get('bar/operation'),
        ],
      },
    });
  });

  test('includes app actions when specified', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            app: ['foo-app', 'bar-app'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: {
        bar: [
          actions.login,
          actions.version,
          actions.app.get('foo-app'),
          actions.app.get('bar-app'),
        ],
      },
    });
  });

  test('includes savedObject all actions when specified', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            app: [],
            savedObject: {
              all: ['foo-type', 'bar-type'],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: {
        bar: [
          actions.login,
          actions.version,
          ...actions.savedObject.allOperations(['foo-type', 'bar-type']),
        ],
      },
    });
  });

  test('includes savedObject read actions when specified', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            app: [],
            savedObject: {
              all: [],
              read: ['foo-type', 'bar-type'],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: {
        bar: [
          actions.login,
          actions.version,
          ...actions.savedObject.readOperations(['foo-type', 'bar-type']),
        ],
      },
    });
  });

  test('includes ui capabilities actions when specified', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['foo-ui-capability', 'bar-ui-capability'],
          },
        },
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: {
        bar: [
          actions.login,
          actions.version,
          actions.ui.get('foo', 'foo-ui-capability'),
          actions.ui.get('foo', 'bar-ui-capability'),
        ],
      },
    });
  });

  test('includes navlink ui capability action when specified', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        navLinkId: 'foo-navlink',
        privileges: {
          bar: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.buildFeaturesPrivileges(features);
    expect(result).toEqual({
      foo: {
        bar: [actions.login, actions.version, actions.ui.get('navLinks', 'foo-navlink')],
      },
    });
  });
});

describe('#getApiReadActions', () => {
  test(`includes api actions from the read privileges`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        privileges: {
          // wrong privilege name
          bar: {
            app: [],
            api: ['foo/api'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          // no api read privileges
          read: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
      {
        id: 'bar',
        name: '',
        privileges: {
          // this one should show up in the results
          read: {
            app: [],
            api: ['foo/api'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.getApiReadActions(features);
    expect(result).toEqual([actions.api.get('foo/api')]);
  });
});

describe('#getUIReadActions', () => {
  test(`includes ui actions from the read privileges`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        privileges: {
          // wrong privilege name
          bar: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          // no ui read privileges
          read: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
      {
        id: 'bar',
        name: '',
        privileges: {
          // this ui capability should show up in the results
          read: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['bar-ui-capability'],
          },
        },
      },
    ];
    const result = builder.getUIReadActions(features);
    expect(result).toEqual([actions.ui.get('bar', 'bar-ui-capability')]);
  });
});
