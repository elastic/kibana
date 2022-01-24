/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '../../../../../features/public';
import { KibanaFeature } from '../../../../../features/public';

export const createFeature = (
  config: Pick<
    KibanaFeatureConfig,
    'id' | 'name' | 'subFeatures' | 'reserved' | 'privilegesTooltip'
  > & {
    excludeFromBaseAll?: boolean;
    excludeFromBaseRead?: boolean;
    privileges?: KibanaFeatureConfig['privileges'];
    category?: KibanaFeatureConfig['category'];
    requireAllSpacesOnAllPrivilege?: boolean;
    disabledReadPrivilege?: boolean;
  }
) => {
  const {
    excludeFromBaseAll,
    excludeFromBaseRead,
    privileges,
    category,
    requireAllSpacesOnAllPrivilege: requireAllSpaces = false,
    disabledReadPrivilege: disabled = false,
    ...rest
  } = config;
  return new KibanaFeature({
    app: [],
    category: category ?? { id: 'foo', label: 'foo' },
    catalogue: [],
    privileges:
      privileges === null
        ? null
        : {
            all: {
              excludeFromBasePrivileges: excludeFromBaseAll,
              savedObject: {
                all: ['all-type'],
                read: ['read-type'],
              },
              ui: ['read-ui', 'all-ui', `read-${config.id}`, `all-${config.id}`],
              requireAllSpaces,
            },
            read: {
              excludeFromBasePrivileges: excludeFromBaseRead,
              savedObject: {
                all: [],
                read: ['read-type'],
              },
              ui: ['read-ui', `read-${config.id}`],
              disabled,
            },
          },
    ...rest,
  });
};

export const kibanaFeatures = [
  createFeature({
    id: 'no_sub_features',
    name: 'Feature 1: No Sub Features',
  }),
  createFeature({
    id: 'with_sub_features',
    name: 'Mutually Exclusive Sub Features',
    subFeatures: [
      {
        name: 'Cool Sub Feature',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'cool_all',
                name: 'All',
                includeIn: 'all',
                savedObject: {
                  all: ['all-cool-type'],
                  read: ['read-cool-type'],
                },
                ui: ['cool_read-ui', 'cool_all-ui'],
              },
              {
                id: 'cool_read',
                name: 'Read',
                includeIn: 'read',
                savedObject: {
                  all: [],
                  read: ['read-cool-type'],
                },
                ui: ['cool_read-ui'],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'cool_toggle_1',
                name: 'Cool toggle 1',
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_toggle_1-ui'],
              },
              {
                id: 'cool_toggle_2',
                name: 'Cool toggle 2',
                includeIn: 'read',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_toggle_2-ui'],
              },
              {
                id: 'cool_excluded_toggle',
                name: 'Cool excluded toggle',
                includeIn: 'none',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_excluded_toggle-ui'],
              },
            ],
          },
        ],
      },
    ],
  }),
  createFeature({
    id: 'with_excluded_sub_features',
    name: 'Excluded Sub Features',
    subFeatures: [
      {
        name: 'Excluded Sub Feature',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'cool_toggle_1',
                name: 'Cool toggle 1',
                includeIn: 'none',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_toggle_1-ui'],
              },
            ],
          },
        ],
      },
    ],
  }),
  createFeature({
    id: 'excluded_from_base',
    name: 'Excluded from base',
    excludeFromBaseAll: true,
    excludeFromBaseRead: true,
    subFeatures: [
      {
        name: 'Cool Sub Feature',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'cool_all',
                name: 'All',
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_read-ui', 'cool_all-ui'],
              },
              {
                id: 'cool_read',
                name: 'Read',
                includeIn: 'read',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_read-ui'],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'cool_toggle_1',
                name: 'Cool toggle 2',
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_toggle_1-ui'],
              },
              {
                id: 'cool_toggle_2',
                name: 'Cool toggle 2',
                includeIn: 'read',
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['cool_toggle_2-ui'],
              },
            ],
          },
        ],
      },
    ],
  }),
];
