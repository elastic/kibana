/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesSettingsFeature } from './rules_settings_feature';

test('returns rule settings feature with query delay subfeature if serverless', async () => {
  expect(getRulesSettingsFeature(true)).toEqual({
    app: [],
    category: {
      euiIconType: 'managementApp',
      id: 'management',
      label: 'Management',
      order: 5000,
    },
    id: 'rulesSettings',
    management: {
      insightsAndAlerting: ['triggersActions'],
    },
    name: 'Rules Settings',
    privileges: {
      all: {
        api: [],
        app: [],
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        savedObject: {
          all: ['rules-settings'],
          read: [],
        },
        ui: ['show', 'save'],
      },
      read: {
        api: [],
        app: [],
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        savedObject: {
          all: [],
          read: ['rules-settings'],
        },
        ui: ['show'],
      },
    },
    subFeatures: [
      {
        name: 'Flapping detection',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: ['read-flapping-settings', 'write-flapping-settings'],
                id: 'allFlappingSettings',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: ['rules-settings'],
                  read: [],
                },
                ui: ['writeFlappingSettingsUI', 'readFlappingSettingsUI'],
              },
              {
                api: ['read-flapping-settings'],
                id: 'readFlappingSettings',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: ['rules-settings'],
                },
                ui: ['readFlappingSettingsUI'],
              },
            ],
          },
        ],
      },
      {
        name: 'Query delay',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: ['read-query-delay-settings', 'write-query-delay-settings'],
                id: 'allQueryDelaySettings',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: ['rules-settings'],
                  read: [],
                },
                ui: ['writeQueryDelaySettingsUI', 'readQueryDelaySettingsUI'],
              },
              {
                api: ['read-query-delay-settings'],
                id: 'readQueryDelaySettings',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: ['rules-settings'],
                },
                ui: ['readQueryDelaySettingsUI'],
              },
            ],
          },
        ],
      },
    ],
  });
});

test('returns rule settings feature without query delay subfeature if not serverless', async () => {
  expect(getRulesSettingsFeature(false)).toEqual({
    app: [],
    category: {
      euiIconType: 'managementApp',
      id: 'management',
      label: 'Management',
      order: 5000,
    },
    id: 'rulesSettings',
    management: {
      insightsAndAlerting: ['triggersActions'],
    },
    name: 'Rules Settings',
    privileges: {
      all: {
        api: [],
        app: [],
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        savedObject: {
          all: ['rules-settings'],
          read: [],
        },
        ui: ['show', 'save'],
      },
      read: {
        api: [],
        app: [],
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        savedObject: {
          all: [],
          read: ['rules-settings'],
        },
        ui: ['show'],
      },
    },
    subFeatures: [
      {
        name: 'Flapping detection',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                api: ['read-flapping-settings', 'write-flapping-settings'],
                id: 'allFlappingSettings',
                includeIn: 'all',
                name: 'All',
                savedObject: {
                  all: ['rules-settings'],
                  read: [],
                },
                ui: ['writeFlappingSettingsUI', 'readFlappingSettingsUI'],
              },
              {
                api: ['read-flapping-settings'],
                id: 'readFlappingSettings',
                includeIn: 'read',
                name: 'Read',
                savedObject: {
                  all: [],
                  read: ['rules-settings'],
                },
                ui: ['readFlappingSettingsUI'],
              },
            ],
          },
        ],
      },
    ],
  });
});
