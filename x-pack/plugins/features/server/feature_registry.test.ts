/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureRegistry } from './feature_registry';
import { IFeature } from '../common/feature';

describe('FeatureRegistry', () => {
  it('allows a minimal feature to be registered', () => {
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
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
    const feature: IFeature = {
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
          name: 'All',
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
        read: {
          name: 'Read',
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
      privilegesTooltip: 'some fancy tooltip',
      reserved: {
        privilege: {
          name: '',
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
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {
        all: {
          name: 'All',
          ui: [],
          savedObject: {
            all: [],
            read: [],
          },
        },
        read: {
          name: 'Read',
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

    const allPrivilege = result[0].privileges?.all;
    expect(allPrivilege?.savedObject.all).toEqual(['telemetry']);
  });

  it(`automatically grants 'read' access to config and url saved objects for both privileges`, () => {
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {
        all: {
          name: 'All',
          ui: [],
          savedObject: {
            all: [],
            read: [],
          },
        },
        read: {
          name: 'Read',
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

    const allPrivilege = result[0].privileges?.all;
    const readPrivilege = result[0].privileges?.read;
    expect(allPrivilege?.savedObject.read).toEqual(['config', 'url']);
    expect(readPrivilege?.savedObject.read).toEqual(['config', 'url']);
  });

  it(`automatically grants 'all' access to telemetry and 'read' to [config, url] saved objects for the reserved privilege`, () => {
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      reserved: {
        description: 'foo',
        privilege: {
          name: '',
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
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      privileges: {
        all: {
          name: 'All',
          ui: [],
          savedObject: {
            all: ['telemetry'],
            read: ['config', 'url'],
          },
        },
        read: {
          name: 'Read',
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

    const allPrivilege = result[0].privileges?.all;
    const readPrivilege = result[0].privileges?.read;
    expect(allPrivilege?.savedObject.all).toEqual(['telemetry']);
    expect(allPrivilege?.savedObject.read).toEqual(['config', 'url']);
    expect(readPrivilege?.savedObject.read).toEqual(['config', 'url']);
  });

  it(`does not allow duplicate features to be registered`, () => {
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
    };

    const duplicateFeature: IFeature = {
      id: 'test-feature',
      name: 'Duplicate Test Feature',
      app: [],
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
        })
      ).toThrowErrorMatchingSnapshot();
    });
  });

  it('prevents features from being registered with invalid privilege names', () => {
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: ['app1', 'app2'],
      privileges: {
        foo: {
          name: 'Foo',
          app: ['app1', 'app2'],
          savedObject: {
            all: ['config', 'space', 'etc'],
            read: ['canvas'],
          },
          api: ['someApiEndpointTag', 'anotherEndpointTag'],
          ui: ['allowsFoo', 'showBar', 'showBaz'],
        },
      } as any,
    };

    const featureRegistry = new FeatureRegistry();
    expect(() => featureRegistry.register(feature)).toThrowErrorMatchingInlineSnapshot(
      `"child \\"privileges\\" fails because [\\"foo\\" is not allowed]"`
    );
  });

  it(`prevents privileges from specifying app entries that don't exist at the root level`, () => {
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: ['bar'],
      privileges: {
        all: {
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: ['foo', 'bar', 'baz'],
        },
        read: {
          name: 'Read',
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
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: ['bar'],
      reserved: {
        description: 'something',
        privilege: {
          name: '',
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
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      privileges: {
        all: {
          name: 'All',
          catalogue: ['foo', 'bar', 'baz'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
          app: [],
        },
        read: {
          name: 'Read',
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
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      reserved: {
        description: 'something',
        privilege: {
          name: '',
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
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      management: {
        kibana: ['hey'],
      },
      privileges: {
        all: {
          name: 'All',
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
        read: {
          name: 'Read',
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
    const feature: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      catalogue: ['bar'],
      management: {
        kibana: ['hey'],
      },
      reserved: {
        description: 'something',
        privilege: {
          name: '',
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
    const feature1: IFeature = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
    };
    const feature2: IFeature = {
      id: 'test-feature-2',
      name: 'Test Feature 2',
      app: [],
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
