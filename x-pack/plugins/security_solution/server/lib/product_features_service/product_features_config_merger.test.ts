/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ProductFeaturesConfigMerger } from './product_features_config_merger';
import type { Logger } from '@kbn/core/server';
import type { ProductFeatureKibanaConfig } from '@kbn/security-solution-features';
import type { KibanaFeatureConfig, SubFeatureConfig } from '@kbn/features-plugin/common';

const category = {
  id: 'security',
  label: 'Security app category',
};

const baseKibanaFeature: KibanaFeatureConfig = {
  id: 'FEATURE_ID',
  name: 'Base Feature',
  order: 1100,
  category,
  app: ['FEATURE_ID', 'kibana'],
  catalogue: ['APP_ID'],
  privileges: {
    all: {
      api: ['api-read', 'api-write'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['write', 'read'],
    },
    read: {
      api: ['api-read'],
      app: ['FEATURE_ID', 'kibana'],
      catalogue: ['APP_ID'],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read'],
    },
  },
};
const subFeature1: SubFeatureConfig = {
  requireAllSpaces: true,
  name: 'subFeature1',
  description: 'Perform subFeature1 actions.',
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: ['api-subFeature1'],
          id: 'sub-feature-1_all',
          includeIn: 'none',
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['subFeature1'],
        },
      ],
    },
  ],
};
const subFeature2: SubFeatureConfig = {
  requireAllSpaces: true,
  name: 'subFeature2',
  description: 'Perform subFeature2 actions.',
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: ['api-readSubFeature2', 'api-writeSubFeature2'],
          id: 'sub-feature-2_all',
          includeIn: 'none',
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readSubFeature2', 'writeSubFeature2'],
        },
        {
          api: ['api-readSubFeature2'],
          id: 'sub-feature-2_read',
          includeIn: 'none',
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readSubFeature2'],
        },
      ],
    },
  ],
};
const subFeature3: SubFeatureConfig = {
  requireAllSpaces: true,
  name: 'subFeature3',
  description: 'Perform subFeature3 actions.',
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          api: ['api-readSubFeature3', 'api-writeSubFeature3'],
          id: 'sub-feature-3_all',
          includeIn: 'none',
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['readSubFeature3', 'writeSubFeature3'],
        },
      ],
    },
  ],
};

// Defines the order of the Security Cases sub features
export const subFeaturesMap = Object.freeze(
  new Map<string, SubFeatureConfig>([
    ['subFeature1', subFeature1],
    ['subFeature2', subFeature2],
    ['subFeature3', subFeature3],
  ])
);

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('ProductFeaturesConfigMerger', () => {
  const merger = new ProductFeaturesConfigMerger(mockLogger, subFeaturesMap);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('main privileges', () => {
    it('should merge enabled main privileges into base config', () => {
      const enabledProductFeaturesConfigs: ProductFeatureKibanaConfig[] = [
        {
          privileges: {
            all: {
              api: ['api-write', 'api-extra-all'],
              ui: ['extra-all'],
              cases: {
                create: ['APP_ID'],
                read: ['APP_ID'],
                update: ['APP_ID'],
                push: ['APP_ID'],
              },
              savedObject: {
                all: ['someSavedObjectType'],
                read: ['someSavedObjectType'],
              },
            },
            read: {
              api: ['api-extra-read'],
              ui: ['extra-read'],
              cases: {
                read: ['APP_ID'],
              },
              savedObject: {
                all: [],
                read: ['someSavedObjectType'],
              },
            },
          },
        },
      ];

      const merged = merger.mergeProductFeatureConfigs(
        baseKibanaFeature,
        [],
        enabledProductFeaturesConfigs
      );

      expect(merged).toEqual({
        ...baseKibanaFeature,
        privileges: {
          all: {
            api: ['api-read', 'api-write', 'api-extra-all'],
            app: ['FEATURE_ID', 'kibana'],
            catalogue: ['APP_ID'],
            ui: ['write', 'read', 'extra-all'],
            cases: {
              create: ['APP_ID'],
              read: ['APP_ID'],
              update: ['APP_ID'],
              push: ['APP_ID'],
            },
            savedObject: {
              all: ['someSavedObjectType'],
              read: ['someSavedObjectType'],
            },
          },
          read: {
            api: ['api-read', 'api-extra-read'],
            app: ['FEATURE_ID', 'kibana'],
            catalogue: ['APP_ID'],
            ui: ['read', 'extra-read'],
            cases: {
              read: ['APP_ID'],
            },
            savedObject: {
              all: [],
              read: ['someSavedObjectType'],
            },
          },
        },
        subFeatures: [],
      });
    });
  });

  describe('subFeatureIds', () => {
    it('adds base subFeatures in the correct order', () => {
      const baseKibanaSubFeatureIds = ['subFeature2', 'subFeature3', 'subFeature1'];

      const merged = merger.mergeProductFeatureConfigs(
        baseKibanaFeature,
        baseKibanaSubFeatureIds,
        []
      );
      expect(merged.subFeatures).toEqual([subFeature1, subFeature2, subFeature3]);
    });

    it('should merge enabled subFeatures into base config in the correct order', () => {
      const enabledProductFeaturesConfigs: ProductFeatureKibanaConfig[] = [
        {
          subFeatureIds: ['subFeature3', 'subFeature1'],
        },
      ];

      const merged = merger.mergeProductFeatureConfigs(
        baseKibanaFeature,
        ['subFeature2'],
        enabledProductFeaturesConfigs
      );

      expect(merged).toEqual({
        ...baseKibanaFeature,
        subFeatures: [subFeature1, subFeature2, subFeature3],
      });
    });
  });

  describe('subFeaturePrivileges', () => {
    it('should merge enabled subFeatures with extra subFeaturePrivileges into base config in the correct order', () => {
      const enabledProductFeaturesConfigs: ProductFeatureKibanaConfig[] = [
        {
          subFeaturesPrivileges: [
            {
              id: 'sub-feature-1_all',
              api: ['api-subFeature1-extra1', 'api-subFeature1-extra2'],
              ui: ['subFeature1-extra1', 'subFeature1-extra2'],
            },
            {
              id: 'sub-feature-2_read',
              api: ['api-readSubFeature2-extra1', 'api-readSubFeature2-extra2'],
              ui: ['readSubFeature2-extra1', 'readSubFeature2-extra2'],
            },
          ],
        },
        {
          subFeatureIds: ['subFeature3', 'subFeature1'],
        },
      ];

      const merged = merger.mergeProductFeatureConfigs(
        baseKibanaFeature,
        ['subFeature2'],
        enabledProductFeaturesConfigs
      );
      expect(merged).toEqual({
        ...baseKibanaFeature,
        subFeatures: [
          {
            ...subFeature1,
            privilegeGroups: [
              {
                ...subFeature1.privilegeGroups[0],
                privileges: [
                  {
                    ...subFeature1.privilegeGroups[0].privileges[0],
                    api: ['api-subFeature1', 'api-subFeature1-extra1', 'api-subFeature1-extra2'],
                    ui: ['subFeature1', 'subFeature1-extra1', 'subFeature1-extra2'],
                  },
                ],
              },
            ],
          },
          {
            ...subFeature2,
            privilegeGroups: [
              {
                ...subFeature2.privilegeGroups[0],
                privileges: [
                  subFeature2.privilegeGroups[0].privileges[0],
                  {
                    ...subFeature2.privilegeGroups[0].privileges[1],
                    api: [
                      'api-readSubFeature2',
                      'api-readSubFeature2-extra1',
                      'api-readSubFeature2-extra2',
                    ],
                    ui: ['readSubFeature2', 'readSubFeature2-extra1', 'readSubFeature2-extra2'],
                  },
                ],
              },
            ],
          },
          subFeature3,
        ],
      });
    });

    it('should warn if there are subFeaturesPrivileges for a subFeature id that is not found', () => {
      const subFeaturesPrivilegesId = 'sub-feature-1_all';
      const enabledProductFeaturesConfigs: ProductFeatureKibanaConfig[] = [
        {
          subFeaturesPrivileges: [
            {
              id: subFeaturesPrivilegesId,
              api: ['api-subFeature1-extra1', 'api-subFeature1-extra2'],
              ui: ['subFeature1-extra1', 'subFeature1-extra2'],
            },
          ],
        },
      ];

      const merged = merger.mergeProductFeatureConfigs(
        baseKibanaFeature,
        ['subFeature2', 'subFeature3'],
        enabledProductFeaturesConfigs
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Trying to merge subFeaturesPrivileges ${subFeaturesPrivilegesId} but the subFeature privilege was not found`
      );
      expect(merged).toEqual({ ...baseKibanaFeature, subFeatures: [subFeature2, subFeature3] });
    });
  });

  it('should merge everything at the same time', () => {
    const enabledProductFeaturesConfigs: ProductFeatureKibanaConfig[] = [
      {
        privileges: {
          all: {
            api: ['api-write', 'api-extra-all'],
            ui: ['extra-all'],
            cases: {
              create: ['APP_ID'],
              read: ['APP_ID'],
              update: ['APP_ID'],
              push: ['APP_ID'],
            },
            savedObject: {
              all: ['someSavedObjectType'],
              read: ['someSavedObjectType'],
            },
          },
          read: {
            api: ['api-extra-read'],
            ui: ['extra-read'],
            cases: {
              read: ['APP_ID'],
            },
            savedObject: {
              all: [],
              read: ['someSavedObjectType'],
            },
          },
        },
        subFeatureIds: ['subFeature3', 'subFeature1'],
        subFeaturesPrivileges: [
          {
            id: 'sub-feature-1_all',
            api: ['api-subFeature1-extra1', 'api-subFeature1-extra2'],
            ui: ['subFeature1-extra1', 'subFeature1-extra2'],
          },
          {
            id: 'sub-feature-2_all',
            api: ['api-writeSubFeature2-extra1', 'api-writeSubFeature2-extra2'],
            ui: ['writeSubFeature2-extra1', 'writeSubFeature2-extra2'],
          },
        ],
      },
    ];
    const baseKibanaSubFeatureIds = ['subFeature2'];

    const merged = merger.mergeProductFeatureConfigs(
      baseKibanaFeature,
      baseKibanaSubFeatureIds,
      enabledProductFeaturesConfigs
    );

    expect(merged).toEqual({
      ...baseKibanaFeature,
      privileges: {
        all: {
          api: ['api-read', 'api-write', 'api-extra-all'],
          app: ['FEATURE_ID', 'kibana'],
          catalogue: ['APP_ID'],
          ui: ['write', 'read', 'extra-all'],
          cases: {
            create: ['APP_ID'],
            read: ['APP_ID'],
            update: ['APP_ID'],
            push: ['APP_ID'],
          },
          savedObject: {
            all: ['someSavedObjectType'],
            read: ['someSavedObjectType'],
          },
        },
        read: {
          api: ['api-read', 'api-extra-read'],
          app: ['FEATURE_ID', 'kibana'],
          catalogue: ['APP_ID'],
          ui: ['read', 'extra-read'],
          cases: {
            read: ['APP_ID'],
          },
          savedObject: {
            all: [],
            read: ['someSavedObjectType'],
          },
        },
      },
      subFeatures: [
        {
          ...subFeature1,
          privilegeGroups: [
            {
              ...subFeature1.privilegeGroups[0],
              privileges: [
                {
                  ...subFeature1.privilegeGroups[0].privileges[0],
                  api: ['api-subFeature1', 'api-subFeature1-extra1', 'api-subFeature1-extra2'],
                  ui: ['subFeature1', 'subFeature1-extra1', 'subFeature1-extra2'],
                },
              ],
            },
          ],
        },
        {
          ...subFeature2,
          privilegeGroups: [
            {
              ...subFeature2.privilegeGroups[0],
              privileges: [
                {
                  ...subFeature2.privilegeGroups[0].privileges[0],
                  api: [
                    'api-readSubFeature2',
                    'api-writeSubFeature2',
                    'api-writeSubFeature2-extra1',
                    'api-writeSubFeature2-extra2',
                  ],
                  ui: [
                    'readSubFeature2',
                    'writeSubFeature2',
                    'writeSubFeature2-extra1',
                    'writeSubFeature2-extra2',
                  ],
                },
                subFeature2.privilegeGroups[0].privileges[1],
              ],
            },
          ],
        },
        subFeature3,
      ],
    });
  });
});
