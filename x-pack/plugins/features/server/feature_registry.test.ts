/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureRegistry } from './feature_registry';
import {
  ElasticsearchFeatureConfig,
  FeatureKibanaPrivilegesReference,
  KibanaFeatureConfig,
} from '../common';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

describe('FeatureRegistry', () => {
  describe('Kibana Features', () => {
    it('allows a minimal feature to be registered', () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllKibanaFeatures();
      expect(result).toHaveLength(1);

      // Should be the equal, but not the same instance (i.e., a defensive copy)
      expect(result[0].toRaw()).not.toBe(feature);
      expect(result[0].toRaw()).toEqual(feature);
    });

    it('allows a complex feature to be registered', () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        excludeFromBasePrivileges: true,
        app: ['app1'],
        category: { id: 'foo', label: 'foo' },
        minimumLicense: 'platinum',
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
              read: ['canvas', 'config', 'config-global', 'url'],
            },
            api: ['someApiEndpointTag', 'anotherEndpointTag'],
            ui: ['allowsFoo', 'showBar', 'showBaz'],
          },
          read: {
            savedObject: {
              all: [],
              read: ['config', 'config-global', 'url', 'telemetry'],
            },
            ui: [],
          },
        },
        subFeatures: [
          {
            name: 'sub-feature-1',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'foo',
                    name: 'foo',
                    includeIn: 'read',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                  },
                ],
              },
              {
                groupType: 'mutually_exclusive',
                privileges: [
                  {
                    id: 'bar',
                    name: 'bar',
                    includeIn: 'all',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                  },
                  {
                    id: 'baz',
                    name: 'baz',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                  },
                ],
              },
            ],
          },
        ],
        privilegesTooltip: 'some fancy tooltip',
        reserved: {
          privileges: [
            {
              id: 'reserved',
              privilege: {
                catalogue: ['foo'],
                management: {
                  foo: ['bar'],
                },
                app: ['app1'],
                savedObject: {
                  all: ['space', 'etc', 'telemetry'],
                  read: ['canvas', 'config', 'config-global', 'url'],
                },
                api: ['someApiEndpointTag', 'anotherEndpointTag'],
                ui: ['allowsFoo', 'showBar', 'showBaz'],
              },
            },
          ],
          description: 'some completely adequate description',
        },
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllKibanaFeatures();
      expect(result).toHaveLength(1);

      // Should be the equal, but not the same instance (i.e., a defensive copy)
      expect(result[0].toRaw()).not.toBe(feature);
      expect(result[0].toRaw()).toEqual(feature);
    });

    describe('category', () => {
      it('is required', () => {
        const feature: KibanaFeatureConfig = {
          id: 'test-feature',
          name: 'Test Feature',
          app: [],
          privileges: null,
        } as any;

        const featureRegistry = new FeatureRegistry();
        expect(() =>
          featureRegistry.registerKibanaFeature(feature)
        ).toThrowErrorMatchingInlineSnapshot(
          `"[category.id]: expected value of type [string] but got [undefined]"`
        );
      });

      it('must have an id', () => {
        const feature: KibanaFeatureConfig = {
          id: 'test-feature',
          name: 'Test Feature',
          app: [],
          privileges: null,
          category: { label: 'foo' },
        } as any;

        const featureRegistry = new FeatureRegistry();
        expect(() =>
          featureRegistry.registerKibanaFeature(feature)
        ).toThrowErrorMatchingInlineSnapshot(
          `"[category.id]: expected value of type [string] but got [undefined]"`
        );
      });

      it('must have a label', () => {
        const feature: KibanaFeatureConfig = {
          id: 'test-feature',
          name: 'Test Feature',
          app: [],
          privileges: null,
          category: { id: 'foo' },
        } as any;

        const featureRegistry = new FeatureRegistry();
        expect(() =>
          featureRegistry.registerKibanaFeature(feature)
        ).toThrowErrorMatchingInlineSnapshot(
          `"[category.label]: expected value of type [string] but got [undefined]"`
        );
      });
    });

    it('requires only a valid scope registered', () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        // @ts-expect-error
        scope: ['foo', 'bar'],
      };

      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature has unknown scope entries: foo, bar"`
      );
    });

    it(`requires a value for privileges`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
      } as any;

      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[privileges]: expected at least one defined value but got [undefined]"`
      );
    });

    it(`does not allow sub-features to be registered when no primary privileges are not registered`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        subFeatures: [
          {
            name: 'my sub feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'my-sub-priv',
                    name: 'my sub priv',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[subFeatures]: array size is [1], but cannot be greater than [0]"`
      );
    });

    it(`automatically grants 'all' access to telemetry saved objects for the 'all' privilege`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
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
      featureRegistry.registerKibanaFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllKibanaFeatures();

      expect(result[0].privileges).toHaveProperty('all');
      expect(result[0].privileges).toHaveProperty('read');

      const allPrivilege = result[0].privileges?.all;
      expect(allPrivilege?.savedObject.all).toEqual(['telemetry']);
    });

    it(`automatically grants access to config, config-global, url, and telemetry saved objects`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
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
      featureRegistry.registerKibanaFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllKibanaFeatures();

      expect(result[0].privileges).toHaveProperty('all');
      expect(result[0].privileges).toHaveProperty('read');

      const allPrivilege = result[0].privileges?.all;
      const readPrivilege = result[0].privileges?.read;
      expect(allPrivilege?.savedObject.read).toEqual(['config', 'config-global', 'url']);
      expect(readPrivilege?.savedObject.read).toEqual([
        'config',
        'config-global',
        'telemetry',
        'url',
      ]);
    });

    it(`automatically grants 'all' access to telemetry and 'read' to [config, config-global, url] saved objects for the reserved privilege`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        reserved: {
          description: 'foo',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                ui: [],
                savedObject: {
                  all: [],
                  read: [],
                },
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllKibanaFeatures();

      const reservedPrivilege = result[0]!.reserved!.privileges[0].privilege;
      expect(reservedPrivilege.savedObject.all).toEqual(['telemetry']);
      expect(reservedPrivilege.savedObject.read).toEqual(['config', 'config-global', 'url']);
    });

    it(`does not duplicate the automatic grants if specified on the incoming feature`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            ui: [],
            savedObject: {
              all: ['telemetry'],
              read: ['config', 'config-global', 'url'],
            },
          },
          read: {
            ui: [],
            savedObject: {
              all: [],
              read: ['config', 'config-global', 'url'],
            },
          },
        },
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllKibanaFeatures();

      expect(result[0].privileges).toHaveProperty('all');
      expect(result[0].privileges).toHaveProperty('read');

      const allPrivilege = result[0].privileges!.all;
      const readPrivilege = result[0].privileges!.read;
      expect(allPrivilege?.savedObject.all).toEqual(['telemetry']);
      expect(allPrivilege?.savedObject.read).toEqual(['config', 'config-global', 'url']);
      expect(readPrivilege?.savedObject.read).toEqual([
        'config',
        'config-global',
        'url',
        'telemetry',
      ]);
    });

    it(`does not allow duplicate features to be registered`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
      };

      const duplicateFeature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Duplicate Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature);

      expect(() =>
        featureRegistry.registerKibanaFeature(duplicateFeature)
      ).toThrowErrorMatchingInlineSnapshot(`"Feature with id test-feature is already registered."`);
    });

    ['contains space', 'contains_invalid()_chars', ''].forEach((prohibitedChars) => {
      it(`prevents features from being registered with a management id of "${prohibitedChars}"`, () => {
        const featureRegistry = new FeatureRegistry();
        expect(() =>
          featureRegistry.registerKibanaFeature({
            id: 'foo',
            name: 'some feature',
            management: {
              kibana: [prohibitedChars],
            },
            app: [],
            category: { id: 'foo', label: 'foo' },
            privileges: null,
          })
        ).toThrowErrorMatchingSnapshot();
      });

      it(`prevents features from being registered with a catalogue entry of "${prohibitedChars}"`, () => {
        const featureRegistry = new FeatureRegistry();
        expect(() =>
          featureRegistry.registerKibanaFeature({
            id: 'foo',
            name: 'some feature',
            catalogue: [prohibitedChars],
            app: [],
            category: { id: 'foo', label: 'foo' },
            privileges: null,
          })
        ).toThrowErrorMatchingSnapshot();
      });
    });

    ['catalogue', 'management', 'navLinks', `doesn't match valid regex`].forEach((prohibitedId) => {
      it(`prevents features from being registered with an ID of "${prohibitedId}"`, () => {
        const featureRegistry = new FeatureRegistry();
        expect(() =>
          featureRegistry.registerKibanaFeature({
            id: prohibitedId,
            name: 'some feature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            privileges: null,
          })
        ).toThrowErrorMatchingSnapshot();
      });
    });

    it('prevents features from being registered with invalid privilege names', () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: ['app1', 'app2'],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          foo: {
            name: 'Foo',
            app: ['app1', 'app2'],
            savedObject: {
              all: ['config', 'config-global', 'space', 'etc'],
              read: ['canvas'],
            },
            api: ['someApiEndpointTag', 'anotherEndpointTag'],
            ui: ['allowsFoo', 'showBar', 'showBaz'],
          },
        } as any,
      };

      const featureRegistry = new FeatureRegistry();
      expect(() => featureRegistry.registerKibanaFeature(feature))
        .toThrowErrorMatchingInlineSnapshot(`
        "[privileges]: types that failed validation:
        - [privileges.0]: expected value to equal [null]
        - [privileges.1.foo]: definition for this key is missing"
      `);
    });

    it(`prevents privileges from specifying app entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: ['bar'],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: ['foo', 'bar', 'baz'],
          },
          read: {
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

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.all has unknown app entries: foo, baz"`
      );
    });

    it(`prevents features from specifying app entries that don't exist at the privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: ['foo', 'bar', 'baz'],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: ['bar'],
          },
          read: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
        },
        subFeatures: [
          {
            name: 'my sub feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'cool-sub-feature-privilege',
                    name: 'cool privilege',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                    app: ['foo'],
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies app entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents reserved privileges from specifying app entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: ['bar'],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: ['foo', 'bar', 'baz'],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.reserved has unknown app entries: foo, baz"`
      );
    });

    it(`prevents features from specifying app entries that don't exist at the reserved privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: ['foo', 'bar', 'baz'],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: ['foo', 'bar'],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies app entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents privileges from specifying catalogue entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
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
          read: {
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

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.all has unknown catalogue entries: foo, baz"`
      );
    });

    it(`prevents features from specifying catalogue entries that don't exist at the privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['foo', 'bar', 'baz'],
        privileges: {
          all: {
            catalogue: ['foo'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
          read: {
            catalogue: ['foo'],
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
        },
        subFeatures: [
          {
            name: 'my sub feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'cool-sub-feature-privilege',
                    name: 'cool privilege',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                    catalogue: ['bar'],
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies catalogue entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents reserved privileges from specifying catalogue entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['bar'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
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
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.reserved has unknown catalogue entries: foo, baz"`
      );
    });

    it(`prevents features from specifying catalogue entries that don't exist at the reserved privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['foo', 'bar', 'baz'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                catalogue: ['foo', 'bar'],
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies catalogue entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents privileges from specifying alerting/rule entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['bar'],
        privileges: {
          all: {
            alerting: {
              rule: {
                all: ['foo', 'bar'],
                read: ['baz'],
              },
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
          read: {
            alerting: {
              rule: {
                read: ['foo', 'bar', 'baz'],
              },
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

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.all has unknown alerting entries: foo, baz"`
      );
    });

    it(`prevents privileges from specifying alerting/alert entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['bar'],
        privileges: {
          all: {
            alerting: {
              alert: {
                all: ['foo', 'bar'],
                read: ['baz'],
              },
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
          read: {
            alerting: {
              alert: {
                read: ['foo', 'bar', 'baz'],
              },
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

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.all has unknown alerting entries: foo, baz"`
      );
    });

    it(`prevents features from specifying alerting/rule entries that don't exist at the privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['foo', 'bar', 'baz'],
        privileges: {
          all: {
            alerting: {
              rule: {
                all: ['foo'],
              },
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
          read: {
            alerting: {
              rule: {
                all: ['foo'],
              },
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
        },
        subFeatures: [
          {
            name: 'my sub feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'cool-sub-feature-privilege',
                    name: 'cool privilege',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                    alerting: {
                      rule: {
                        all: ['bar'],
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies alerting entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents features from specifying alerting/alert entries that don't exist at the privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['foo', 'bar', 'baz'],
        privileges: {
          all: {
            alerting: {
              alert: {
                all: ['foo'],
              },
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
          read: {
            alerting: {
              alert: {
                all: ['foo'],
              },
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
        },
        subFeatures: [
          {
            name: 'my sub feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'cool-sub-feature-privilege',
                    name: 'cool privilege',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                    alerting: {
                      alert: {
                        all: ['bar'],
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies alerting entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents reserved privileges from specifying alerting/rule entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['bar'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                alerting: {
                  rule: {
                    all: ['foo', 'bar', 'baz'],
                  },
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.reserved has unknown alerting entries: foo, baz"`
      );
    });

    it(`prevents reserved privileges from specifying alerting/alert entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['bar'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                alerting: {
                  alert: {
                    all: ['foo', 'bar', 'baz'],
                  },
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.reserved has unknown alerting entries: foo, baz"`
      );
    });

    it(`prevents features from specifying alerting/rule entries that don't exist at the reserved privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['foo', 'bar', 'baz'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                alerting: {
                  rule: {
                    all: ['foo', 'bar'],
                  },
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies alerting entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents features from specifying alerting/alert entries that don't exist at the reserved privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        alerting: ['foo', 'bar', 'baz'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                alerting: {
                  alert: {
                    all: ['foo', 'bar'],
                  },
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies alerting entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents privileges from specifying cases entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        cases: ['bar'],
        privileges: {
          all: {
            cases: {
              all: ['foo', 'bar'],
              read: ['baz'],
            },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
          read: {
            cases: { read: ['foo', 'bar', 'baz'] },
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

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.all has unknown cases entries: foo, baz"`
      );
    });

    it(`prevents features from specifying cases entries that don't exist at the privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        cases: ['foo', 'bar', 'baz'],
        privileges: {
          all: {
            cases: { all: ['foo'] },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
          read: {
            cases: { all: ['foo'] },
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
            app: [],
          },
        },
        subFeatures: [
          {
            name: 'my sub feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'cool-sub-feature-privilege',
                    name: 'cool privilege',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                    cases: { all: ['bar'] },
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies cases entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents reserved privileges from specifying cases entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        cases: ['bar'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                cases: { all: ['foo', 'bar', 'baz'] },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.reserved has unknown cases entries: foo, baz"`
      );
    });

    it(`prevents features from specifying cases entries that don't exist at the reserved privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        cases: ['foo', 'bar', 'baz'],
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
              privilege: {
                cases: { all: ['foo', 'bar'] },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies cases entries which are not granted to any privileges: baz"`
      );
    });

    it(`prevents privileges from specifying management sections that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
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
          read: {
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

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.all has unknown management section: elasticsearch"`
      );
    });

    it(`prevents features from specifying management sections that don't exist at the privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['bar'],
        management: {
          kibana: ['hey'],
          elasticsearch: ['hey', 'there'],
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
          read: {
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
        subFeatures: [
          {
            name: 'my sub feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'cool-sub-feature-privilege',
                    name: 'cool privilege',
                    includeIn: 'none',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                    management: {
                      kibana: ['hey'],
                      elasticsearch: ['hey'],
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies management entries which are not granted to any privileges: elasticsearch.there"`
      );
    });

    it(`prevents reserved privileges from specifying management entries that don't exist at the root level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['bar'],
        management: {
          kibana: ['hey'],
        },
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
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
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature privilege test-feature.reserved has unknown management entries for section kibana: hey-there"`
      );
    });

    it(`prevents features from specifying management entries that don't exist at the reserved privilege level`, () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['bar'],
        management: {
          kibana: ['hey', 'hey-there'],
        },
        privileges: null,
        reserved: {
          description: 'something',
          privileges: [
            {
              id: 'reserved',
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
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();

      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature specifies management entries which are not granted to any privileges: kibana.hey"`
      );
    });

    it('allows multiple reserved feature privileges to be registered', () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        reserved: {
          description: 'my reserved privileges',
          privileges: [
            {
              id: 'a_reserved_1',
              privilege: {
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
            {
              id: 'a_reserved_2',
              privilege: {
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllKibanaFeatures();
      expect(result).toHaveLength(1);
      expect(result[0].reserved?.privileges).toHaveLength(2);
    });

    it('does not allow reserved privilege ids to start with "reserved_"', () => {
      const feature: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        reserved: {
          description: 'my reserved privileges',
          privileges: [
            {
              id: 'reserved_1',
              privilege: {
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
                app: [],
              },
            },
          ],
        },
      };

      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.registerKibanaFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[reserved.privileges.0.id]: Does not satisfy regexp /^(?!reserved_)[a-zA-Z0-9_-]+$/"`
      );
    });

    it('allows independent sub-feature privileges to register a minimumLicense', () => {
      const feature1: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
        subFeatures: [
          {
            name: 'foo',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'foo',
                    name: 'foo',
                    minimumLicense: 'platinum',
                    includeIn: 'all',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature1);
    });

    it('prevents mutually exclusive sub-feature privileges from registering a minimumLicense', () => {
      const feature1: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
        subFeatures: [
          {
            name: 'foo',
            privilegeGroups: [
              {
                groupType: 'mutually_exclusive',
                privileges: [
                  {
                    id: 'foo',
                    name: 'foo',
                    minimumLicense: 'platinum',
                    includeIn: 'all',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                  },
                  {
                    id: 'bar',
                    name: 'Bar',
                    minimumLicense: 'platinum',
                    includeIn: 'all',
                    savedObject: {
                      all: [],
                      read: [],
                    },
                    ui: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();
      expect(() => {
        featureRegistry.registerKibanaFeature(feature1);
      }).toThrowErrorMatchingInlineSnapshot(`
        "[subFeatures.0.privilegeGroups.0]: types that failed validation:
        - [subFeatures.0.privilegeGroups.0.0.privileges.0.minimumLicense]: a value wasn't expected to be present
        - [subFeatures.0.privilegeGroups.0.1.groupType]: expected value to equal [independent]"
      `);
    });

    it('cannot register kibana feature after lockRegistration has been called', () => {
      const feature1: KibanaFeatureConfig = {
        id: 'test-feature',
        name: 'Test Feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
      };
      const feature2: KibanaFeatureConfig = {
        id: 'test-feature-2',
        name: 'Test Feature 2',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerKibanaFeature(feature1);
      featureRegistry.lockRegistration();
      featureRegistry.getAllKibanaFeatures();
      expect(() => {
        featureRegistry.registerKibanaFeature(feature2);
      }).toThrowErrorMatchingInlineSnapshot(
        `"Features are locked, can't register new features. Attempt to register test-feature-2 failed."`
      );
    });

    describe('#getAllKibanaFeatures', () => {
      const features: KibanaFeatureConfig[] = [
        {
          id: 'gold-feature',
          name: 'Test Feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          minimumLicense: 'gold',
          privileges: null,
        },
        {
          id: 'unlicensed-feature',
          name: 'Test Feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: null,
        },
        {
          id: 'with-sub-feature',
          name: 'Test Feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: { savedObject: { all: [], read: [] }, ui: [] },
            read: { savedObject: { all: [], read: [] }, ui: [] },
          },
          minimumLicense: 'platinum',
          subFeatures: [
            {
              name: 'licensed-sub-feature',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'sub-feature',
                      includeIn: 'all',
                      minimumLicense: 'enterprise',
                      name: 'sub feature',
                      savedObject: { all: [], read: [] },
                      ui: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          deprecated: { notice: 'It was a mistake.' },
          id: 'deprecated-feature',
          name: 'Deprecated Feature',
          app: [],
          category: { id: 'deprecated', label: 'deprecated' },
          privileges: {
            all: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'with-sub-feature', privileges: ['all'] }],
            },
            read: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'with-sub-feature', privileges: ['all'] }],
            },
          },
        },
      ];

      const registry = new FeatureRegistry();
      features.forEach((f) => registry.registerKibanaFeature(f));
      registry.lockRegistration();

      it('returns all features and sub-feature privileges by default', () => {
        const result = registry.getAllKibanaFeatures();
        expect(result.map((f) => f.id)).toEqual([
          'gold-feature',
          'unlicensed-feature',
          'with-sub-feature',
          'deprecated-feature',
        ]);
        const [, , withSubFeature] = result;
        expect(withSubFeature.subFeatures).toHaveLength(1);
        expect(withSubFeature.subFeatures[0].privilegeGroups).toHaveLength(1);
        expect(withSubFeature.subFeatures[0].privilegeGroups[0].privileges).toHaveLength(1);
      });

      it('returns features which are satisfied by the current license', () => {
        const license = licensingMock.createLicense({ license: { type: 'gold' } });
        const result = registry.getAllKibanaFeatures({ license });
        expect(result.map((f) => f.id)).toEqual([
          'gold-feature',
          'unlicensed-feature',
          'deprecated-feature',
        ]);
      });

      it('can omit deprecated features if requested', () => {
        const result = registry.getAllKibanaFeatures({ omitDeprecated: true });
        expect(result.map((f) => f.id)).toEqual([
          'gold-feature',
          'unlicensed-feature',
          'with-sub-feature',
        ]);
      });

      it('filters out sub-feature privileges which do not match the current license', () => {
        const license = licensingMock.createLicense({ license: { type: 'platinum' } });
        const result = registry.getAllKibanaFeatures({ license });
        expect(result.map((f) => f.id)).toEqual([
          'gold-feature',
          'unlicensed-feature',
          'with-sub-feature',
          'deprecated-feature',
        ]);

        const [, , withSubFeature] = result;
        expect(withSubFeature.subFeatures).toHaveLength(1);
        expect(withSubFeature.subFeatures[0].privilegeGroups).toHaveLength(1);
        expect(withSubFeature.subFeatures[0].privilegeGroups[0].privileges).toHaveLength(0);
      });
    });

    describe('#applyOverrides', () => {
      let registry: FeatureRegistry;
      beforeEach(() => {
        registry = new FeatureRegistry();
        const features: KibanaFeatureConfig[] = [
          {
            id: 'featureA',
            name: 'Feature A',
            app: [],
            order: 1,
            category: { id: 'fooA', label: 'fooA' },
            privileges: {
              all: { ui: [], savedObject: { all: [], read: [] } },
              read: { ui: [], savedObject: { all: [], read: [] } },
            },
          },
          {
            id: 'featureB',
            name: 'Feature B',
            app: [],
            order: 2,
            category: { id: 'fooB', label: 'fooB' },
            privileges: null,
          },
          {
            id: 'featureC',
            name: 'Feature C',
            app: [],
            order: 1,
            category: { id: 'fooC', label: 'fooC' },
            privileges: {
              all: { ui: [], savedObject: { all: [], read: [] } },
              read: { ui: [], savedObject: { all: [], read: [] } },
            },
            subFeatures: [
              {
                name: 'subFeatureC',
                privilegeGroups: [
                  {
                    groupType: 'mutually_exclusive',
                    privileges: [
                      {
                        id: 'subFeatureCOne',
                        name: 'subFeature C One',
                        includeIn: 'all',
                        ui: [],
                        savedObject: { all: [], read: [] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'featureD',
            name: 'Feature D',
            app: [],
            order: 1,
            category: { id: 'fooD', label: 'fooD' },
            privileges: {
              all: { ui: [], savedObject: { all: [], read: [] } },
              read: { ui: [], savedObject: { all: [], read: [] } },
            },
          },
          {
            id: 'featureE',
            name: 'Feature E',
            app: [],
            order: 1,
            category: { id: 'fooE', label: 'fooE' },
            privileges: {
              all: {
                ui: [],
                savedObject: { all: [], read: [] },
                alerting: { alert: { all: ['one'] } },
              },
              read: { ui: [], savedObject: { all: [], read: [] } },
            },
            alerting: ['one'],
          },
        ];
        features.forEach((f) => registry.registerKibanaFeature(f));
      });

      it('rejects overrides for unknown features', () => {
        expect(() =>
          registry.applyOverrides({ unknownFeature: {} })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot override feature \\"unknownFeature\\" since feature with such ID is not registered."`
        );
      });

      it('can override basic feature properties', () => {
        registry.applyOverrides({
          featureA: {
            hidden: true,
            name: 'Feature A New',
            category: 'management',
            order: 123,
          },
        });
        registry.lockRegistration();

        const [featureA, featureB] = registry.getAllKibanaFeatures();
        expect(featureA.hidden).toBe(true);
        expect(featureB.hidden).toBeUndefined();

        expect(featureA.name).toBe('Feature A New');
        expect(featureB.name).toBe('Feature B');

        expect(featureA.category).toEqual(DEFAULT_APP_CATEGORIES.management);
        expect(featureB.category).toEqual({ id: 'fooB', label: 'fooB' });

        expect(featureA.order).toBe(123);
        expect(featureB.order).toBe(2);
      });

      it('rejects overrides for unknown privileges', () => {
        expect(() =>
          registry.applyOverrides({ featureB: { privileges: { all: { disabled: true } } } })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot override privilege \\"all\\" of feature \\"featureB\\" since \\"all\\" privilege is not registered."`
        );
      });

      it('rejects overrides for `composedOf` referring to unknown feature', () => {
        expect(() =>
          registry.applyOverrides({
            featureA: {
              privileges: {
                all: { composedOf: [{ feature: 'featureF', privileges: ['all'] }] },
              },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot compose privilege \\"all\\" of feature \\"featureA\\" with privileges of feature \\"featureF\\" since such feature is not registered."`
        );
      });

      it('rejects overrides for `composedOf` referring to unknown feature privilege', () => {
        expect(() =>
          registry.applyOverrides({
            featureA: {
              privileges: {
                all: { composedOf: [{ feature: 'featureB', privileges: ['none'] }] },
              },
            },
          })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot compose privilege \\"all\\" of feature \\"featureA\\" with privilege \\"none\\" of feature \\"featureB\\" since such privilege is not registered."`
        );
      });

      it('can override `composedOf` referring to both feature and sub-feature privileges', () => {
        registry.applyOverrides({
          featureA: {
            privileges: {
              all: {
                composedOf: [
                  { feature: 'featureC', privileges: ['subFeatureCOne'] },
                  { feature: 'featureD', privileges: ['all'] },
                ],
              },
              read: { composedOf: [{ feature: 'featureD', privileges: ['read'] }] },
            },
          },
        });
        registry.lockRegistration();

        const [featureA] = registry.getAllKibanaFeatures();
        expect(featureA.privileges).toEqual({
          all: {
            ui: [],
            savedObject: { all: ['telemetry'], read: ['config', 'config-global', 'url'] },
            composedOf: [
              { feature: 'featureC', privileges: ['subFeatureCOne'] },
              { feature: 'featureD', privileges: ['all'] },
            ],
          },
          read: {
            ui: [],
            savedObject: { all: [], read: ['config', 'config-global', 'telemetry', 'url'] },
            composedOf: [{ feature: 'featureD', privileges: ['read'] }],
          },
        });
      });

      it('can override `composedOf` referring to a feature that requires custom RBAC', () => {
        registry.applyOverrides({
          featureA: {
            privileges: {
              all: { composedOf: [{ feature: 'featureE', privileges: ['all'] }] },
            },
          },
        });
        registry.lockRegistration();

        const [featureA] = registry.getAllKibanaFeatures();
        expect(featureA.privileges).toEqual({
          all: {
            ui: [],
            savedObject: { all: ['telemetry'], read: ['config', 'config-global', 'url'] },
            composedOf: [{ feature: 'featureE', privileges: ['all'] }],
          },
          read: {
            ui: [],
            savedObject: { all: [], read: ['config', 'config-global', 'telemetry', 'url'] },
          },
        });
      });

      it('rejects overrides for unknown sub-feature privileges', () => {
        expect(() =>
          registry.applyOverrides({
            featureC: { subFeatures: { privileges: { all: { disabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot override sub-feature privilege \\"all\\" of feature \\"featureC\\" since \\"all\\" sub-feature privilege is not registered. Known sub-feature privileges are: subFeatureCOne."`
        );

        expect(() =>
          registry.applyOverrides({
            featureA: { subFeatures: { privileges: { subFeatureCOne: { disabled: true } } } },
          })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot override sub-feature privileges of feature \\"featureA\\" since it didn't register any."`
        );
      });

      it('can override sub-feature privileges', () => {
        registry.applyOverrides({
          featureC: {
            subFeatures: { privileges: { subFeatureCOne: { disabled: true, includeIn: 'none' } } },
          },
        });
        registry.lockRegistration();

        const [, , featureC] = registry.getAllKibanaFeatures();
        expect(featureC.subFeatures).toEqual([
          {
            config: {
              name: 'subFeatureC',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      disabled: true,
                      id: 'subFeatureCOne',
                      includeIn: 'none',
                      name: 'subFeature C One',
                      savedObject: { all: [], read: [] },
                      ui: [],
                    },
                  ],
                },
              ],
            },
          },
        ]);
      });
    });

    describe('#validateFeatures', () => {
      function createRegistry(...features: KibanaFeatureConfig[]) {
        const registry = new FeatureRegistry();

        // Non-deprecated feature.
        const featureBeta: KibanaFeatureConfig = {
          id: 'feature-beta',
          name: 'Feature Beta',
          app: [],
          category: { id: 'beta', label: 'beta' },
          privileges: {
            all: { savedObject: { all: [], read: [] }, ui: [] },
            read: { savedObject: { all: [], read: [] }, ui: [] },
          },
          subFeatures: [
            {
              name: 'sub-beta-1',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-beta-1-1',
                      name: 'Sub Beta 1-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                    {
                      id: 'sub-beta-1-2',
                      name: 'Sub Beta 1-2',
                      includeIn: 'read',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                  ],
                },
              ],
            },
            {
              name: 'sub-beta-2',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-beta-2-1',
                      name: 'Sub Beta 2-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                  ],
                },
              ],
            },
          ],
        };

        // Deprecated feature
        const featureGamma: KibanaFeatureConfig = {
          deprecated: { notice: 'It was a mistake.' },
          id: 'feature-gamma',
          name: 'Feature Gamma',
          app: [],
          category: { id: 'gamma', label: 'gamma' },
          privileges: {
            all: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'feature-beta', privileges: ['all'] }],
            },
            read: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
            },
          },
          subFeatures: [
            {
              name: 'sub-gamma-1',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-gamma-1-1',
                      name: 'Sub Gamma 1-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [
                        { feature: 'feature-beta', privileges: ['read', 'sub-beta-2-1'] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        };

        // Non-deprecated feature with disabled privileges.
        const featureDelta: KibanaFeatureConfig = {
          id: 'feature-delta',
          name: 'Feature Delta',
          app: [],
          category: { id: 'delta', label: 'delta' },
          privileges: {
            all: { savedObject: { all: [], read: [] }, ui: [] },
            read: { savedObject: { all: [], read: [] }, ui: [], disabled: true },
          },
        };

        for (const feature of [featureBeta, featureGamma, featureDelta, ...features]) {
          registry.registerKibanaFeature(feature);
        }

        registry.lockRegistration();
        return registry;
      }

      function createDeprecatedFeature({
        all,
        read,
        subAlpha,
      }: {
        all?: FeatureKibanaPrivilegesReference[];
        read?: {
          minimal: FeatureKibanaPrivilegesReference[];
          default: FeatureKibanaPrivilegesReference[];
        };
        subAlpha?: FeatureKibanaPrivilegesReference[];
      } = {}): KibanaFeatureConfig {
        return {
          deprecated: { notice: 'It was a mistake.' },
          id: 'feature-alpha',
          name: 'Feature Alpha',
          app: [],
          category: { id: 'alpha', label: 'alpha' },
          privileges: {
            all: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: all ?? [{ feature: 'feature-beta', privileges: ['all'] }],
            },
            read: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: read ?? {
                default: [{ feature: 'feature-beta', privileges: ['all'] }],
                minimal: [{ feature: 'feature-beta', privileges: ['read', 'sub-beta-2-1'] }],
              },
            },
          },
          subFeatures: [
            {
              name: 'sub-alpha-1',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha-1-1',
                      name: 'Sub Alpha 1-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: subAlpha ?? [
                        { feature: 'feature-beta', privileges: ['sub-beta-1-1'] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        };
      }

      it('requires feature to be deprecated to define privilege replacements', () => {
        const featureAlpha: KibanaFeatureConfig = {
          id: 'feature-alpha',
          name: 'Feature Alpha',
          app: [],
          category: { id: 'alpha', label: 'alpha' },
          privileges: {
            all: { savedObject: { all: [], read: [] }, ui: [] },
            read: { savedObject: { all: [], read: [] }, ui: [] },
          },
        };

        // Case 1: some top-level privileges define replacement.
        let registry = createRegistry({
          ...featureAlpha,
          privileges: {
            all: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'feature-beta', privileges: ['all'] }],
            },
            read: featureAlpha.privileges?.read!,
          },
        });
        expect(() => registry.validateFeatures()).toThrowErrorMatchingInlineSnapshot(
          `"Feature \\"feature-alpha\\" is not deprecated and must not define a \\"replacedBy\\" property for privilege \\"all\\"."`
        );

        // Case 2: some sub-feature privileges define replacement.
        registry = createRegistry({
          ...featureAlpha,
          subFeatures: [
            {
              name: 'sub-alpha',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha',
                      name: 'Sub Alpha',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [{ feature: 'feature-beta', privileges: ['sub-alpha'] }],
                    },
                  ],
                },
              ],
            },
          ],
        });
        expect(() => registry.validateFeatures()).toThrowErrorMatchingInlineSnapshot(
          `"Feature \\"feature-alpha\\" is not deprecated and must not define a \\"replacedBy\\" property for privilege \\"sub-alpha\\"."`
        );

        // Case 3: none of the privileges define replacement.
        registry = createRegistry({
          ...featureAlpha,
          subFeatures: [
            {
              name: 'sub-alpha',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha',
                      name: 'Sub Alpha',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                  ],
                },
              ],
            },
          ],
        });
        expect(() => registry.validateFeatures()).not.toThrow();
      });

      it('requires all top-level privileges of the deprecated feature to define replacement', () => {
        const featureAlphaDeprecated: KibanaFeatureConfig = {
          deprecated: { notice: 'It was a mistake.' },
          id: 'feature-alpha',
          name: 'Feature Alpha',
          app: [],
          category: { id: 'alpha', label: 'alpha' },
          privileges: {
            all: { savedObject: { all: [], read: [] }, ui: [] },
            read: { savedObject: { all: [], read: [] }, ui: [] },
          },
        };

        // Case 1: all top-level privileges don't define replacement.
        let registry = createRegistry(featureAlphaDeprecated);
        expect(() => registry.validateFeatures()).toThrowErrorMatchingInlineSnapshot(
          `"Feature \\"feature-alpha\\" is deprecated and must define a \\"replacedBy\\" property for privilege \\"all\\"."`
        );

        // Case 2: some top-level privileges don't define replacement.
        registry = createRegistry({
          ...featureAlphaDeprecated,
          privileges: {
            all: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'feature-beta', privileges: ['all'] }],
            },
            read: { savedObject: { all: [], read: [] }, ui: [] },
          },
        });
        expect(() => registry.validateFeatures()).toThrowErrorMatchingInlineSnapshot(
          `"Feature \\"feature-alpha\\" is deprecated and must define a \\"replacedBy\\" property for privilege \\"read\\"."`
        );

        // Case 3: all top-level privileges define replacement.
        registry = createRegistry({
          ...featureAlphaDeprecated,
          privileges: {
            all: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'feature-beta', privileges: ['all'] }],
            },
            read: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
            },
          },
        });
        expect(() => registry.validateFeatures()).not.toThrow();
      });

      it('requires all sub-feature privileges of the deprecated feature to define replacement', () => {
        const featureAlphaDeprecated: KibanaFeatureConfig = {
          deprecated: { notice: 'It was a mistake.' },
          id: 'feature-alpha',
          name: 'Feature Alpha',
          app: [],
          category: { id: 'alpha', label: 'alpha' },
          privileges: {
            all: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: [{ feature: 'feature-beta', privileges: ['all'] }],
            },
            read: {
              savedObject: { all: [], read: [] },
              ui: [],
              replacedBy: {
                default: [{ feature: 'feature-beta', privileges: ['all'] }],
                minimal: [{ feature: 'feature-beta', privileges: ['read'] }],
              },
            },
          },
          subFeatures: [
            {
              name: 'sub-alpha-1',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha-1-1',
                      name: 'Sub Alpha 1-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                    {
                      id: 'sub-alpha-1-2',
                      name: 'Sub Alpha 1-2',
                      includeIn: 'read',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                  ],
                },
              ],
            },
            {
              name: 'sub-alpha-2',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha-2-1',
                      name: 'Sub Alpha 2-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                  ],
                },
              ],
            },
          ],
        };

        // Case 1: all sub-feature privileges don't define replacement.
        let registry = createRegistry(featureAlphaDeprecated);
        expect(() => registry.validateFeatures()).toThrowErrorMatchingInlineSnapshot(
          `"Feature \\"feature-alpha\\" is deprecated and must define a \\"replacedBy\\" property for privilege \\"sub-alpha-1-1\\"."`
        );

        // Case 2: some sub-feature privileges of some sub-features don't define replacement.
        registry = createRegistry({
          ...featureAlphaDeprecated,
          subFeatures: [
            {
              name: 'sub-alpha-1',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha-1-1',
                      name: 'Sub Alpha 1-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
                    },
                    {
                      id: 'sub-alpha-1-2',
                      name: 'Sub Alpha 1-2',
                      includeIn: 'read',
                      ui: [],
                      savedObject: { all: [], read: [] },
                    },
                  ],
                },
              ],
            },
            featureAlphaDeprecated.subFeatures?.[1]!,
          ],
        });
        expect(() => registry.validateFeatures()).toThrowErrorMatchingInlineSnapshot(
          `"Feature \\"feature-alpha\\" is deprecated and must define a \\"replacedBy\\" property for privilege \\"sub-alpha-1-2\\"."`
        );

        // Case 3: all sub-feature privileges of some sub-features don't define replacement.
        registry = createRegistry({
          ...featureAlphaDeprecated,
          subFeatures: [
            {
              name: 'sub-alpha-1',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha-1-1',
                      name: 'Sub Alpha 1-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
                    },
                    {
                      id: 'sub-alpha-1-2',
                      name: 'Sub Alpha 1-2',
                      includeIn: 'read',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
                    },
                  ],
                },
              ],
            },
            featureAlphaDeprecated.subFeatures?.[1]!,
          ],
        });
        expect(() => registry.validateFeatures()).toThrowErrorMatchingInlineSnapshot(
          `"Feature \\"feature-alpha\\" is deprecated and must define a \\"replacedBy\\" property for privilege \\"sub-alpha-2-1\\"."`
        );

        // Case 4: all top-level and sub-feature privileges define replacement.
        registry = createRegistry({
          ...featureAlphaDeprecated,
          subFeatures: [
            {
              name: 'sub-alpha-1',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha-1-1',
                      name: 'Sub Alpha 1-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
                    },
                    {
                      id: 'sub-alpha-1-2',
                      name: 'Sub Alpha 1-2',
                      includeIn: 'read',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
                    },
                  ],
                },
              ],
            },
            {
              name: 'sub-alpha-2',
              privilegeGroups: [
                {
                  groupType: 'mutually_exclusive',
                  privileges: [
                    {
                      id: 'sub-alpha-2-1',
                      name: 'Sub Alpha 2-1',
                      includeIn: 'all',
                      ui: [],
                      savedObject: { all: [], read: [] },
                      replacedBy: [{ feature: 'feature-beta', privileges: ['read'] }],
                    },
                  ],
                },
              ],
            },
          ],
        });
        expect(() => registry.validateFeatures()).not.toThrow();
      });

      it('requires referenced feature to exist', () => {
        // Case 1: top-level privilege references to a non-existent feature.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({ all: [{ feature: 'feature-unknown', privileges: ['all'] }] })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"all\\" of deprecated feature \\"feature-alpha\\" with privileges of feature \\"feature-unknown\\" since such feature is not registered."`
        );

        // Case 2: top-level privilege references to a non-existent feature (extended format).
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              read: {
                default: [{ feature: 'feature-beta', privileges: ['all'] }],
                minimal: [{ feature: 'feature-unknown', privileges: ['read', 'sub-beta-2-1'] }],
              },
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"read\\" of deprecated feature \\"feature-alpha\\" with privileges of feature \\"feature-unknown\\" since such feature is not registered."`
        );

        // Case 3: sub-feature privilege references to a non-existent feature.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              subAlpha: [{ feature: 'feature-unknown', privileges: ['sub-beta-1-1'] }],
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"sub-alpha-1-1\\" of deprecated feature \\"feature-alpha\\" with privileges of feature \\"feature-unknown\\" since such feature is not registered."`
        );

        // Case 4: all top-level and sub-feature privileges define proper replacement.
        expect(() => createRegistry(createDeprecatedFeature()).validateFeatures()).not.toThrow();
      });

      it('requires referenced feature to not be deprecated', () => {
        // Case 1: top-level privilege references to a deprecated feature.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({ all: [{ feature: 'feature-gamma', privileges: ['all'] }] })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"all\\" of deprecated feature \\"feature-alpha\\" with privileges of feature \\"feature-gamma\\" since the referenced feature is deprecated."`
        );

        // Case 2: top-level privilege references to a deprecated feature (extended format).
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              read: {
                default: [{ feature: 'feature-beta', privileges: ['all'] }],
                minimal: [{ feature: 'feature-gamma', privileges: ['read'] }],
              },
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"read\\" of deprecated feature \\"feature-alpha\\" with privileges of feature \\"feature-gamma\\" since the referenced feature is deprecated."`
        );

        // Case 3: sub-feature privilege references to a deprecated feature.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              subAlpha: [{ feature: 'feature-gamma', privileges: ['sub-gamma-1-1'] }],
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"sub-alpha-1-1\\" of deprecated feature \\"feature-alpha\\" with privileges of feature \\"feature-gamma\\" since the referenced feature is deprecated."`
        );
      });

      it('requires referenced privilege to exist', () => {
        // Case 1: top-level privilege references to a non-existent privilege.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({ all: [{ feature: 'feature-beta', privileges: ['all_v2'] }] })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"all\\" of deprecated feature \\"feature-alpha\\" with privilege \\"all_v2\\" of feature \\"feature-beta\\" since such privilege is not registered."`
        );

        // Case 2: top-level privilege references to a non-existent privilege (extended format).
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              read: {
                default: [{ feature: 'feature-beta', privileges: ['all'] }],
                minimal: [{ feature: 'feature-beta', privileges: ['read_v2'] }],
              },
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"read\\" of deprecated feature \\"feature-alpha\\" with privilege \\"read_v2\\" of feature \\"feature-beta\\" since such privilege is not registered."`
        );

        // Case 3: sub-feature privilege references to a non-existent privilege.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              subAlpha: [{ feature: 'feature-beta', privileges: ['sub-gamma-1-1_v2'] }],
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"sub-alpha-1-1\\" of deprecated feature \\"feature-alpha\\" with privilege \\"sub-gamma-1-1_v2\\" of feature \\"feature-beta\\" since such privilege is not registered."`
        );
      });

      it('requires referenced privilege to not be disabled', () => {
        // Case 1: top-level privilege references to a disabled privilege.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({ all: [{ feature: 'feature-delta', privileges: ['read'] }] })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"all\\" of deprecated feature \\"feature-alpha\\" with disabled privilege \\"read\\" of feature \\"feature-delta\\"."`
        );

        // Case 2: top-level privilege references to a disabled privilege (extended format).
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              read: {
                default: [{ feature: 'feature-beta', privileges: ['all'] }],
                minimal: [{ feature: 'feature-delta', privileges: ['all', 'read'] }],
              },
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"read\\" of deprecated feature \\"feature-alpha\\" with disabled privilege \\"read\\" of feature \\"feature-delta\\"."`
        );

        // Case 3: sub-feature privilege references to a disabled privilege.
        expect(() =>
          createRegistry(
            createDeprecatedFeature({
              subAlpha: [{ feature: 'feature-delta', privileges: ['read'] }],
            })
          ).validateFeatures()
        ).toThrowErrorMatchingInlineSnapshot(
          `"Cannot replace privilege \\"sub-alpha-1-1\\" of deprecated feature \\"feature-alpha\\" with disabled privilege \\"read\\" of feature \\"feature-delta\\"."`
        );
      });
    });
  });

  describe('Elasticsearch Features', () => {
    it('allows a minimal feature to be registered', () => {
      const feature: ElasticsearchFeatureConfig = {
        id: 'test-feature',
        privileges: [
          {
            requiredClusterPrivileges: ['all'],
            ui: [],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerElasticsearchFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllElasticsearchFeatures();
      expect(result).toHaveLength(1);

      // Should be the equal, but not the same instance (i.e., a defensive copy)
      expect(result[0].toRaw()).not.toBe(feature);
      expect(result[0].toRaw()).toEqual(feature);
    });

    it('allows a complex feature to ge registered', () => {
      const feature: ElasticsearchFeatureConfig = {
        id: 'test-feature',
        management: {
          kibana: ['foo'],
          data: ['bar'],
        },
        catalogue: ['foo', 'bar'],
        privileges: [
          {
            requiredClusterPrivileges: ['monitor', 'manage'],
            requiredIndexPrivileges: {
              foo: ['read'],
              bar: ['all'],
              baz: ['view_index_metadata'],
            },
            ui: ['ui_a'],
          },
          {
            requiredClusterPrivileges: [],
            requiredRoles: ['some_role'],
            ui: ['ui_b'],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerElasticsearchFeature(feature);
      featureRegistry.lockRegistration();
      const result = featureRegistry.getAllElasticsearchFeatures();
      expect(result).toHaveLength(1);

      // Should be the equal, but not the same instance (i.e., a defensive copy)
      expect(result[0].toRaw()).not.toBe(feature);
      expect(result[0].toRaw()).toEqual(feature);
    });

    it('requires a value for privileges', () => {
      const feature: ElasticsearchFeatureConfig = {
        id: 'test-feature',
      } as any;
      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.registerElasticsearchFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"[privileges]: expected value of type [array] but got [undefined]"`
      );
    });

    it('requires privileges to declare some form of required es privileges', () => {
      const feature: ElasticsearchFeatureConfig = {
        id: 'test-feature',
        privileges: [
          {
            ui: [],
          },
        ],
      } as any;
      const featureRegistry = new FeatureRegistry();
      expect(() =>
        featureRegistry.registerElasticsearchFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Feature test-feature has a privilege definition at index 0 without any privileges defined."`
      );
    });

    it('does not allow duplicate privilege ids', () => {
      const feature: ElasticsearchFeatureConfig = {
        id: 'test-feature',
        privileges: [
          {
            requiredClusterPrivileges: ['all'],
            ui: [],
          },
        ],
      };
      const featureRegistry = new FeatureRegistry();
      featureRegistry.registerElasticsearchFeature(feature);
      expect(() =>
        featureRegistry.registerElasticsearchFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(`"Feature with id test-feature is already registered."`);
    });

    it('cannot register elasticsearch feature after lockRegistration has been called', () => {
      const feature: ElasticsearchFeatureConfig = {
        id: 'test-feature',
        privileges: [
          {
            requiredClusterPrivileges: ['all'],
            ui: [],
          },
        ],
      };

      const featureRegistry = new FeatureRegistry();
      featureRegistry.lockRegistration();

      expect(() =>
        featureRegistry.registerElasticsearchFeature(feature)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Features are locked, can't register new features. Attempt to register test-feature failed."`
      );
    });
  });

  it('does not allow a Kibana feature to share an id with an Elasticsearch feature', () => {
    const kibanaFeature: KibanaFeatureConfig = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: null,
    };

    const elasticsearchFeature: ElasticsearchFeatureConfig = {
      id: 'test-feature',
      privileges: [
        {
          requiredClusterPrivileges: ['all'],
          ui: [],
        },
      ],
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.registerElasticsearchFeature(elasticsearchFeature);
    expect(() =>
      featureRegistry.registerKibanaFeature(kibanaFeature)
    ).toThrowErrorMatchingInlineSnapshot(`"Feature with id test-feature is already registered."`);
  });

  it('does not allow an Elasticsearch feature to share an id with a Kibana feature', () => {
    const kibanaFeature: KibanaFeatureConfig = {
      id: 'test-feature',
      name: 'Test Feature',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: null,
    };

    const elasticsearchFeature: ElasticsearchFeatureConfig = {
      id: 'test-feature',
      privileges: [
        {
          requiredClusterPrivileges: ['all'],
          ui: [],
        },
      ],
    };

    const featureRegistry = new FeatureRegistry();
    featureRegistry.registerKibanaFeature(kibanaFeature);
    expect(() =>
      featureRegistry.registerElasticsearchFeature(elasticsearchFeature)
    ).toThrowErrorMatchingInlineSnapshot(`"Feature with id test-feature is already registered."`);
  });
});
