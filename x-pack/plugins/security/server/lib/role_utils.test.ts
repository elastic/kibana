/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFeature } from '@kbn/features-plugin/common';
import { getKibanaRoleSchema } from '@kbn/security-plugin-types-server';

import {
  transformPrivilegesToElasticsearchPrivileges,
  validateKibanaPrivileges,
} from './role_utils';
import { ALL_SPACES_ID } from '../../common/constants';

describe('transformPrivilegesToElasticsearchPrivileges', () => {
  test('returns expected result', () => {
    expect(
      transformPrivilegesToElasticsearchPrivileges('kibana,-kibana', [
        {
          spaces: [ALL_SPACES_ID],
          feature: {
            uptime: ['all'],
          },
        },
      ])
    ).toEqual([
      { application: 'kibana,-kibana', privileges: ['feature_uptime.all'], resources: ['*'] },
    ]);
  });
});

describe('validateKibanaPrivileges', () => {
  test('properly validates sub-feature privileges', () => {
    const existingKibanaFeatures = [
      new KibanaFeature({
        id: 'feature1',
        name: 'Feature1',
        app: ['app1'],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            app: ['foo'],
            catalogue: ['foo'],
            savedObject: { all: ['foo'], read: [] },
            ui: ['save', 'show'],
          },
          read: {
            app: ['foo'],
            catalogue: ['foo'],
            savedObject: { all: [], read: ['foo'] },
            ui: ['show'],
          },
        },
      }),
      new KibanaFeature({
        id: 'feature2',
        name: 'Feature2',
        app: ['app2'],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            app: ['foo'],
            catalogue: ['foo'],
            savedObject: { all: ['foo'], read: [] },
            ui: ['save', 'show'],
          },
          read: {
            app: ['foo'],
            catalogue: ['foo'],
            savedObject: { all: [], read: ['foo'] },
            ui: ['show'],
          },
        },
        subFeatures: [
          {
            name: 'subFeature1',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'subFeaturePrivilege1',
                    name: 'SubFeaturePrivilege1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: [],
                  },
                  {
                    disabled: true,
                    id: 'subFeaturePrivilege2',
                    name: 'SubFeaturePrivilege2',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: [],
                  },
                  {
                    disabled: true,
                    id: 'subFeaturePrivilege3',
                    name: 'SubFeaturePrivilege3',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: [],
                  },
                ],
              },
            ],
          },
          {
            name: 'subFeature2',
            privilegeGroups: [
              {
                groupType: 'mutually_exclusive',
                privileges: [
                  {
                    disabled: true,
                    id: 'subFeaturePrivilege4',
                    name: 'SubFeaturePrivilege4',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: [],
                  },
                  {
                    id: 'subFeaturePrivilege5',
                    name: 'SubFeaturePrivilege5',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: [],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ];

    const { validationErrors: emptyErrors } = validateKibanaPrivileges(
      existingKibanaFeatures,
      getKibanaRoleSchema(() => ({ global: [], space: [] })).validate([
        {
          feature: {
            feature2: ['all', 'subFeaturePrivilege1', 'subFeaturePrivilege5'],
          },
        },
      ])
    );
    expect(emptyErrors).toHaveLength(0);

    const { validationErrors: nonEmptyErrors1 } = validateKibanaPrivileges(
      existingKibanaFeatures,
      getKibanaRoleSchema(() => ({ global: [], space: [] })).validate([
        {
          feature: {
            feature2: [
              'all',
              'subFeaturePrivilege1',
              'subFeaturePrivilege2',
              'subFeaturePrivilege5',
            ],
          },
        },
      ])
    );
    expect(nonEmptyErrors1).toEqual([
      'Feature [feature2] does not support specified sub-feature privileges [subFeaturePrivilege2].',
    ]);

    const { validationErrors: nonEmptyErrors2 } = validateKibanaPrivileges(
      existingKibanaFeatures,
      getKibanaRoleSchema(() => ({ global: [], space: [] })).validate([
        {
          feature: {
            feature2: [
              'all',
              'subFeaturePrivilege1',
              'subFeaturePrivilege2',
              'subFeaturePrivilege3',
              'subFeaturePrivilege4',
              'subFeaturePrivilege5',
            ],
          },
        },
      ])
    );
    expect(nonEmptyErrors2).toEqual([
      'Feature [feature2] does not support specified sub-feature privileges [subFeaturePrivilege2, subFeaturePrivilege3].',
      'Feature [feature2] does not support specified sub-feature privileges [subFeaturePrivilege4].',
    ]);
  });
});
