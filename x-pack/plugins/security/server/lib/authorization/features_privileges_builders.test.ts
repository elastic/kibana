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

  test('includes catalogue actions when specified', () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            catalogue: ['fooEntry', 'barEntry'],
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
          actions.ui.get('catalogue', 'fooEntry'),
          actions.ui.get('catalogue', 'barEntry'),
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

  test(`includes api actions from other privileges when "grantWithBaseRead" is true`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        privileges: {
          bar: {
            app: [],
            // This should show up in the results
            grantWithBaseRead: true,
            api: ['bar/api'],
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
    expect(result).toEqual([actions.api.get('bar/api'), actions.api.get('foo/api')]);
  });
});

describe('#getUIFeaturesReadActions', () => {
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
            ui: ['foo'],
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
    const result = builder.getUIFeaturesReadActions(features);
    expect(result).toEqual([actions.ui.get('bar', 'bar-ui-capability')]);
  });

  test(`includes ui actions from other privileges when "grantWithBaseRead" is true`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        privileges: {
          // this should show up in the results
          bar: {
            grantWithBaseRead: true,
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['foo-ui-capability'],
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
    const result = builder.getUIFeaturesReadActions(features);
    expect(result).toEqual([
      actions.ui.get('foo', 'foo-ui-capability'),
      actions.ui.get('bar', 'bar-ui-capability'),
    ]);
  });
});

describe('#getUIManagementReadActions', () => {
  test(`includes management actions from the read privileges`, () => {
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
          // no management read privileges
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
        management: {
          kibana: ['fooManagementLink', 'otherManagementLink'],
          es: ['barManagementLink', 'bazManagementLink'],
        },
        privileges: {
          // this management capability should show up in the results
          read: {
            app: [],
            management: {
              kibana: ['fooManagementLink'],
              es: ['barManagementLink', 'bazManagementLink'],
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.getUIManagementReadActions(features);
    expect(result).toEqual([
      actions.ui.get('management', 'kibana', 'fooManagementLink'),
      actions.ui.get('management', 'es', 'barManagementLink'),
      actions.ui.get('management', 'es', 'bazManagementLink'),
    ]);
  });

  test(`includes management actions from the feature when not specified on the privilege`, () => {
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
          // no management read privileges
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
        management: {
          kibana: ['fooManagementLink', 'otherManagementLink'],
          es: ['barManagementLink', 'bazManagementLink'],
        },
        privileges: {
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
    ];
    const result = builder.getUIManagementReadActions(features);
    expect(result).toEqual([
      actions.ui.get('management', 'kibana', 'fooManagementLink'),
      actions.ui.get('management', 'kibana', 'otherManagementLink'),
      actions.ui.get('management', 'es', 'barManagementLink'),
      actions.ui.get('management', 'es', 'bazManagementLink'),
    ]);
  });

  test(`excludes management actions when an empty object is specified on the privilege`, () => {
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
          // no management read privileges
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
        management: {
          kibana: ['fooManagementLink', 'otherManagementLink'],
          es: ['barManagementLink', 'bazManagementLink'],
        },
        privileges: {
          read: {
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            management: {},
          },
        },
      },
    ];
    const result = builder.getUIManagementReadActions(features);
    expect(result).toEqual([]);
  });

  test(`includes management actions from other privileges when "grantWithBaseRead" is true`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        management: {
          foo: ['bar'],
        },
        privileges: {
          // this management capability should show up in the results
          bar: {
            grantWithBaseRead: true,
            app: [],
            management: {
              foo: ['bar'],
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          // no management read privileges
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
        management: {
          kibana: ['fooManagementLink', 'otherManagementLink'],
          es: ['barManagementLink', 'bazManagementLink'],
        },
        privileges: {
          // this management capability should show up in the results
          read: {
            app: [],
            management: {
              kibana: ['fooManagementLink'],
              es: ['barManagementLink', 'bazManagementLink'],
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.getUIManagementReadActions(features);
    expect(result).toEqual([
      actions.ui.get('management', 'foo', 'bar'),
      actions.ui.get('management', 'kibana', 'fooManagementLink'),
      actions.ui.get('management', 'es', 'barManagementLink'),
      actions.ui.get('management', 'es', 'bazManagementLink'),
    ]);
  });
});

describe('#getUICatalogueReadActions', () => {
  test(`includes catalogue actions from the read privileges`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        privileges: {
          // wrong privilege name
          bar: {
            catalogue: [],
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          // no catalogue read privileges
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
        catalogue: ['barCatalogueLink', 'bazCatalogueLink', 'anotherCatalogueLink'],
        privileges: {
          // this catalogue capability should show up in the results
          read: {
            app: [],
            catalogue: ['barCatalogueLink', 'bazCatalogueLink'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.getUICatalogueReadActions(features);
    expect(result).toEqual([
      actions.ui.get('catalogue', 'barCatalogueLink'),
      actions.ui.get('catalogue', 'bazCatalogueLink'),
    ]);
  });

  test(`includes catalogue actions from the feature when not specified on the privilege`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        privileges: {
          // wrong privilege name
          bar: {
            catalogue: [],
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          // no catalogue read privileges
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
        catalogue: ['barCatalogueLink', 'bazCatalogueLink', 'anotherCatalogueLink'],
        privileges: {
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
    ];
    const result = builder.getUICatalogueReadActions(features);
    expect(result).toEqual([
      actions.ui.get('catalogue', 'barCatalogueLink'),
      actions.ui.get('catalogue', 'bazCatalogueLink'),
      actions.ui.get('catalogue', 'anotherCatalogueLink'),
    ]);
  });

  test(`excludes catalogue actions from the feature when an empty array is specified on the privilege`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        privileges: {
          // wrong privilege name
          bar: {
            catalogue: [],
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          // no catalogue read privileges
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
        catalogue: [],
        privileges: {
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
    ];
    const result = builder.getUICatalogueReadActions(features);
    expect(result).toEqual([]);
  });

  test(`includes catalogue actions from other privileges when "grantWithBaseRead" is true`, () => {
    const actions = new Actions(versionNumber);
    const builder = new FeaturesPrivilegesBuilder(actions);
    const features: Feature[] = [
      {
        id: 'foo',
        name: '',
        catalogue: ['fooCatalogueLink'],
        privileges: {
          // this catalogue capability should show up in the results
          bar: {
            catalogue: ['fooCatalogueLink'],
            grantWithBaseRead: true,
            app: [],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          // no catalogue read privileges
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
        catalogue: ['barCatalogueLink', 'bazCatalogueLink', 'anotherCatalogueLink'],
        privileges: {
          // this catalogue capability should show up in the results
          read: {
            app: [],
            catalogue: ['barCatalogueLink', 'bazCatalogueLink'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      },
    ];
    const result = builder.getUICatalogueReadActions(features);
    expect(result).toEqual([
      actions.ui.get('catalogue', 'fooCatalogueLink'),
      actions.ui.get('catalogue', 'barCatalogueLink'),
      actions.ui.get('catalogue', 'bazCatalogueLink'),
    ]);
  });
});
