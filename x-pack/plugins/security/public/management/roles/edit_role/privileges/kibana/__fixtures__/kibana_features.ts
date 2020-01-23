/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IFeature } from '../../../../../../../../features/common';
import { Feature } from '../../../../../../../../features/public';

export const createFeature = (
  config: Pick<IFeature, 'id' | 'name' | 'subFeatures' | 'reserved'> & {
    excludeFromBaseAll?: boolean;
    excludeFromBaseRead?: boolean;
  }
) => {
  return new Feature({
    icon: 'discoverApp',
    navLinkId: 'kibana:discover',
    app: [],
    catalogue: [],
    privileges: {
      all: {
        name: 'All',
        excludeFromBasePrivileges: config.excludeFromBaseAll,
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        name: 'Read',
        excludeFromBasePrivileges: config.excludeFromBaseRead,
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
    ...config,
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
                  all: [],
                  read: [],
                },
                ui: [],
              },
              {
                id: 'cool_read',
                name: 'Read',
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
                ui: [],
              },
              {
                id: 'cool_toggle_2',
                name: 'Cool toggle 2',
                includeIn: 'read',
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
                name: 'Cool toggle 2',
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
                ui: [],
              },
              {
                id: 'cool_read',
                name: 'Read',
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
                ui: [],
              },
              {
                id: 'cool_toggle_2',
                name: 'Cool toggle 2',
                includeIn: 'read',
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
  }),
];
