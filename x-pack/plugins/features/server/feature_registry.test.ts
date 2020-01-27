/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureRegistry } from './feature_registry';
import { Feature } from '../common/feature';

describe('FeatureRegistry', () => {
  it('allows a minimal feature to be registered', () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {},
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();
    expect(result).toHaveLength(1);

    // Should be the equal, but not the same instance (i.e., a defensive copy)
    expect(result[0]).not.toBe(feature);
    expect(result[0]).toEqual(feature);
  });

  it('allows a complex feature to be registered', () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      excludeFromBasePrivileges: true,
      icon: 'addDataApp',
      navLinkId: 'someNavLink',
      app: ['app1', 'app2'],
      validLicenses: ['standard', 'basic', 'gold', 'platinum'],
      catalogue: ['foo'],
      management: {
        foo: ['bar'],
      },
      privileges: {
        all: {
          catalogue: ['foo'],
          management: {
            foo: ['bar'],
          },
          app: ['app1'],
          savedObject: {
            all: ['space', 'etc', 'telemetry'],
            read: ['canvas', 'config', 'url'],
          },
          api: ['someApiEndpointTag', 'anotherEndpointTag'],
          ui: ['allowsFoo', 'showBar', 'showBaz'],
        },
      },
      privilegesTooltip: 'some fancy tooltip',
      reserved: {
        privilege: {
          catalogue: ['foo'],
          management: {
            foo: ['bar'],
          },
          app: ['app1'],
          savedObject: {
            all: ['space', 'etc', 'telemetry'],
            read: ['canvas', 'config', 'url'],
          },
          api: ['someApiEndpointTag', 'anotherEndpointTag'],
          ui: ['allowsFoo', 'showBar', 'showBaz'],
        },
        description: 'some completely adequate description',
      },
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();
    expect(result).toHaveLength(1);

    // Should be the equal, but not the same instance (i.e., a defensive copy)
    expect(result[0]).not.toBe(feature);
    expect(result[0]).toEqual(feature);
  });

  it(`automatically grants 'all' access to telemetry saved objects for the 'all' privilege`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {
        all: {
          ui: [],
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();

    const allPrivilege = result[0].privileges.all;
    expect(allPrivilege.savedObject.all).toEqual(['telemetry']);
  });

  it(`automatically grants 'read' access to config and url saved objects for both privileges`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {
        all: {
          ui: [],
          savedObject: {
            all: [],
            read: [],
          },
        },
        read: {
          ui: [],
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();

    const allPrivilege = result[0].privileges.all;
    const readPrivilege = result[0].privileges.read;
    expect(allPrivilege.savedObject.read).toEqual(['config', 'url']);
    expect(readPrivilege.savedObject.read).toEqual(['config', 'url']);
  });

  it(`automatically grants 'all' access to telemetry and 'read' to [config, url] saved objects for the reserved privilege`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {},
      reserved: {
        description: 'foo',
        privilege: {
          ui: [],
          savedObject: {
            all: [],
            read: [],
          },
        },
      },
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();

    const reservedPrivilege = result[0]!.reserved!.privilege;
    expect(reservedPrivilege.savedObject.all).toEqual(['telemetry']);
    expect(reservedPrivilege.savedObject.read).toEqual(['config', 'url']);
  });

  it(`does not duplicate the automatic grants if specified on the incoming feature`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {
        all: {
          ui: [],
          savedObject: {
            all: ['telemetry'],
            read: ['config', 'url'],
          },
        },
        read: {
          ui: [],
          savedObject: {
            all: [],
            read: ['config', 'url'],
          },
        },
      },
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);
    const result = featureRegistry.getAll();

    const allPrivilege = result[0].privileges.all;
    const readPrivilege = result[0].privileges.read;
    expect(allPrivilege.savedObject.all).toEqual(['telemetry']);
    expect(allPrivilege.savedObject.read).toEqual(['config', 'url']);
    expect(readPrivilege.savedObject.read).toEqual(['config', 'url']);
  });

  it(`does not allow duplicate features to be registered`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {},
    };

    const duplicateFeature: Feature = {
      id: 'test-feature',
      name: 'Duplicate Test Feature',
      app: [],
      privileges: {},
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature);

    expect(() => featureRegistry.register(duplicateFeature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature with id test-feature is already registered."`
    );
  });

  ['contains space', 'contains_invalid()_chars', ''].forEach(prohibitedChars => {
    it(`prevents features from being registered with a navLinkId of "${prohibitedChars}"`, () => {
      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.register({
          id: 'foo',
          name: 'some feature',
          navLinkId: prohibitedChars,
          app: [],
          privileges: {},
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it(`prevents features from being registered with a management id of "${prohibitedChars}"`, () => {
      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.register({
          id: 'foo',
          name: 'some feature',
          management: {
            kibana: [prohibitedChars],
          },
          app: [],
          privileges: {},
        })
      ).toThrowErrorMatchingSnapshot();
    });

    it(`prevents features from being registered with a catalogue entry of "${prohibitedChars}"`, () => {
      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.register({
          id: 'foo',
          name: 'some feature',
          catalogue: [prohibitedChars],
          app: [],
          privileges: {},
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });

  ['catalogue', 'management', 'navLinks', `doesn't match valid regex`].forEach(prohibitedId => {
    it(`prevents features from being registered with an ID of "${prohibitedId}"`, () => {
      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.register({
          id: prohibitedId,
          name: 'some feature',
          app: [],
          privileges: {},
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });

  it('prevents features from being registered with invalid privilege names', () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: ['app1', 'app2'],
      privileges: {
        foo: {
          app: ['app1', 'app2'],
          savedObject: {
            all: ['config', 'space', 'etc'],
            read: ['canvas'],
          },
          api: ['someApiEndpointTag', 'anotherEndpointTag'],
          ui: ['allowsFoo', 'showBar', 'showBaz'],
        },
      },
    };

    const featureRegistry = new FeatureRegistry();
    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"child \\"privileges\\" fails because [\\"foo\\" is not allowed]"`
    );
  });

  it(`prevents privileges from specifying app entries that don't exist at the root level`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: ['bar'],
      privileges: {
        all: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: ['foo', 'bar', 'baz'],
        },
      },
    };

    const featureRegistry = new FeatureRegistry();

    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature privilege test-feature.all has unknown app entries: foo, baz"`
    );
  });

  it(`prevents reserved privileges from specifying app entries that don't exist at the root level`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: ['bar'],
      privileges: {},
      reserved: {
        description: 'something',
        privilege: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: ['foo', 'bar', 'baz'],
        },
      },
    };

    const featureRegistry = new FeatureRegistry();

    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature privilege test-feature.reserved has unknown app entries: foo, baz"`
    );
  });

  it(`prevents privileges from specifying catalogue entries that don't exist at the root level`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      privileges: {
        all: {
          catalogue: ['foo', 'bar', 'baz'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: [],
        },
      },
    };

    const featureRegistry = new FeatureRegistry();

    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature privilege test-feature.all has unknown catalogue entries: foo, baz"`
    );
  });

  it(`prevents reserved privileges from specifying catalogue entries that don't exist at the root level`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      privileges: {},
      reserved: {
        description: 'something',
        privilege: {
          catalogue: ['foo', 'bar', 'baz'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: [],
        },
      },
    };

    const featureRegistry = new FeatureRegistry();

    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature privilege test-feature.reserved has unknown catalogue entries: foo, baz"`
    );
  });

  it(`prevents privileges from specifying management sections that don't exist at the root level`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      management: {
        kibana: ['hey'],
      },
      privileges: {
        all: {
          catalogue: ['bar'],
          management: {
            elasticsearch: ['hey'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: [],
        },
      },
    };

    const featureRegistry = new FeatureRegistry();

    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature privilege test-feature.all has unknown management section: elasticsearch"`
    );
  });

  it(`prevents reserved privileges from specifying management entries that don't exist at the root level`, () => {
    const feature: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      management: {
        kibana: ['hey'],
      },
      privileges: {},
      reserved: {
        description: 'something',
        privilege: {
          catalogue: ['bar'],
          management: {
            kibana: ['hey-there'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: [],
        },
      },
    };

    const featureRegistry = new FeatureRegistry();

    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"Feature privilege test-feature.reserved has unknown management entries for section kibana: hey-there"`
    );
  });

  it('cannot register feature after getAll has been called', () => {
    const feature1: Feature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {},
    };
    const feature2: Feature = {
      id: 'test-feature-2',
      name: 'Test Feature 2',
      app: [],
      privileges: {},
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.register(feature1);
    featureRegistry.getAll();
    expect(() => {
      featureRegistry.register(feature2);
    }).toThrowErrorMatchingInlineSnapshot(
      `"Features are locked, can't register new features. Attempt to register test-feature-2 failed."`
    );
  });
});
