/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiCapabilitiesForFeatures } from './ui_capabilities_for_features';
import { KibanaFeature } from '.';
import { SubFeaturePrivilegeGroupConfig, ElasticsearchFeature } from '../common';

function createKibanaFeaturePrivilege(capabilities: string[] = []) {
  return {
    savedObject: {
      all: [],
      read: [],
    },
    app: [],
    ui: [...capabilities],
  };
}

function createKibanaSubFeaturePrivilege(privilegeId: string, capabilities: string[] = []) {
  return {
    id: privilegeId,
    name: `sub-feature privilege ${privilegeId}`,
    includeIn: 'none',
    savedObject: {
      all: [],
      read: [],
    },
    app: [],
    ui: [...capabilities],
  };
}

describe('populateUICapabilities', () => {
  it('handles no original uiCapabilities and no registered features gracefully', () => {
    expect(uiCapabilitiesForFeatures([], [])).toEqual({});
  });

  it('handles kibana features with no registered capabilities', () => {
    expect(
      uiCapabilitiesForFeatures(
        [
          new KibanaFeature({
            id: 'newFeature',
            name: 'my new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: createKibanaFeaturePrivilege(),
              read: createKibanaFeaturePrivilege(),
            },
          }),
        ],
        []
      )
    ).toEqual({
      catalogue: {},
      management: {},
      newFeature: {},
    });
  });

  it('handles elasticsearch features with no registered capabilities', () => {
    expect(
      uiCapabilitiesForFeatures(
        [],
        [
          new ElasticsearchFeature({
            id: 'newFeature',
            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: [],
              },
            ],
          }),
        ]
      )
    ).toEqual({
      catalogue: {},
      management: {},
      newFeature: {},
    });
  });

  it('augments the original uiCapabilities with registered kibana feature capabilities', () => {
    expect(
      uiCapabilitiesForFeatures(
        [
          new KibanaFeature({
            id: 'newFeature',
            name: 'my new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: createKibanaFeaturePrivilege(['capability1', 'capability2']),
              read: createKibanaFeaturePrivilege(),
            },
          }),
        ],
        []
      )
    ).toEqual({
      catalogue: {},
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
      },
    });
  });

  it('augments the original uiCapabilities with registered elasticsearch feature capabilities', () => {
    expect(
      uiCapabilitiesForFeatures(
        [],
        [
          new ElasticsearchFeature({
            id: 'newFeature',
            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: ['capability1', 'capability2'],
              },
            ],
          }),
        ]
      )
    ).toEqual({
      catalogue: {},
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
      },
    });
  });

  it('combines catalogue entries from multiple kibana features', () => {
    expect(
      uiCapabilitiesForFeatures(
        [
          new KibanaFeature({
            id: 'newFeature',
            name: 'my new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['anotherFooEntry', 'anotherBarEntry'],
            privileges: {
              all: createKibanaFeaturePrivilege(['capability1', 'capability2']),
              read: createKibanaFeaturePrivilege(['capability3', 'capability4']),
            },
          }),
        ],
        []
      )
    ).toEqual({
      catalogue: {
        anotherFooEntry: true,
        anotherBarEntry: true,
      },
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
    });
  });

  it('combines catalogue entries from multiple elasticsearch privileges', () => {
    expect(
      uiCapabilitiesForFeatures(
        [],
        [
          new ElasticsearchFeature({
            id: 'newFeature',
            catalogue: ['anotherFooEntry', 'anotherBarEntry'],
            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: ['capability1', 'capability2'],
              },
              {
                requiredClusterPrivileges: [],
                ui: ['capability3', 'capability4'],
              },
            ],
          }),
        ]
      )
    ).toEqual({
      catalogue: {
        anotherFooEntry: true,
        anotherBarEntry: true,
      },
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
    });
  });

  it(`merges capabilities from all feature privileges`, () => {
    expect(
      uiCapabilitiesForFeatures(
        [
          new KibanaFeature({
            id: 'newFeature',
            name: 'my new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: createKibanaFeaturePrivilege(['capability1', 'capability2']),
              read: createKibanaFeaturePrivilege(['capability3', 'capability4', 'capability5']),
            },
          }),
        ],
        []
      )
    ).toEqual({
      catalogue: {},
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        capability5: true,
      },
    });
  });

  it(`supports capabilities from reserved privileges`, () => {
    expect(
      uiCapabilitiesForFeatures(
        [
          new KibanaFeature({
            id: 'newFeature',
            name: 'my new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: null,
            reserved: {
              description: '',
              privileges: [
                {
                  id: 'rp_1',
                  privilege: createKibanaFeaturePrivilege(['capability1', 'capability2']),
                },
                {
                  id: 'rp_2',
                  privilege: createKibanaFeaturePrivilege([
                    'capability3',
                    'capability4',
                    'capability5',
                  ]),
                },
              ],
            },
          }),
        ],
        []
      )
    ).toEqual({
      catalogue: {},
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        capability5: true,
      },
    });
  });

  it(`supports merging features with sub privileges`, () => {
    expect(
      uiCapabilitiesForFeatures(
        [
          new KibanaFeature({
            id: 'newFeature',
            name: 'my new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: createKibanaFeaturePrivilege(['capability1', 'capability2']),
              read: createKibanaFeaturePrivilege(['capability3', 'capability4']),
            },
            subFeatures: [
              {
                name: 'sub-feature-1',
                privilegeGroups: [
                  {
                    groupType: 'independent',
                    privileges: [
                      createKibanaSubFeaturePrivilege('privilege-1', ['capability5']),
                      createKibanaSubFeaturePrivilege('privilege-2', ['capability6']),
                    ],
                  } as SubFeaturePrivilegeGroupConfig,
                  {
                    groupType: 'mutually_exclusive',
                    privileges: [
                      createKibanaSubFeaturePrivilege('privilege-3', ['capability7']),
                      createKibanaSubFeaturePrivilege('privilege-4', ['capability8']),
                    ],
                  } as SubFeaturePrivilegeGroupConfig,
                ],
              },
              {
                name: 'sub-feature-2',
                privilegeGroups: [
                  {
                    name: 'Group Name',
                    groupType: 'independent',
                    privileges: [
                      createKibanaSubFeaturePrivilege('privilege-5', [
                        'capability9',
                        'capability10',
                      ]),
                    ],
                  } as SubFeaturePrivilegeGroupConfig,
                ],
              },
            ],
          }),
        ],
        []
      )
    ).toEqual({
      catalogue: {},
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        capability5: true,
        capability6: true,
        capability7: true,
        capability8: true,
        capability9: true,
        capability10: true,
      },
    });
  });

  it('supports merging multiple kibana features with multiple privileges each', () => {
    expect(
      uiCapabilitiesForFeatures(
        [
          new KibanaFeature({
            id: 'newFeature',
            name: 'my new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: createKibanaFeaturePrivilege(['capability1', 'capability2']),
              read: createKibanaFeaturePrivilege(['capability3', 'capability4']),
            },
          }),
          new KibanaFeature({
            id: 'anotherNewFeature',
            name: 'another new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: createKibanaFeaturePrivilege(['capability1', 'capability2']),
              read: createKibanaFeaturePrivilege(['capability3', 'capability4']),
            },
          }),
          new KibanaFeature({
            id: 'yetAnotherNewFeature',
            name: 'yet another new feature',
            app: ['bar-app'],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: createKibanaFeaturePrivilege(['capability1', 'capability2']),
              read: createKibanaFeaturePrivilege(['something1', 'something2', 'something3']),
            },
            subFeatures: [
              {
                name: 'sub-feature-1',
                privilegeGroups: [
                  {
                    groupType: 'independent',
                    privileges: [
                      createKibanaSubFeaturePrivilege('privilege-1', ['capability3']),
                      createKibanaSubFeaturePrivilege('privilege-2', ['capability4']),
                    ],
                  } as SubFeaturePrivilegeGroupConfig,
                ],
              },
            ],
          }),
        ],
        []
      )
    ).toEqual({
      anotherNewFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
      catalogue: {},
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
      yetAnotherNewFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        something1: true,
        something2: true,
        something3: true,
      },
    });
  });

  it('supports merging multiple elasticsearch features with multiple privileges each', () => {
    expect(
      uiCapabilitiesForFeatures(
        [],
        [
          new ElasticsearchFeature({
            id: 'newFeature',

            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: ['capability1', 'capability2'],
              },
              {
                requiredClusterPrivileges: [],
                ui: ['capability3', 'capability4'],
              },
            ],
          }),
          new ElasticsearchFeature({
            id: 'anotherNewFeature',

            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: ['capability1', 'capability2'],
              },
              {
                requiredClusterPrivileges: [],
                ui: ['capability3', 'capability4'],
              },
            ],
          }),
          new ElasticsearchFeature({
            id: 'yetAnotherNewFeature',

            privileges: [
              {
                requiredClusterPrivileges: [],
                ui: ['capability1', 'capability2', 'capability3', 'capability4'],
              },
              {
                requiredClusterPrivileges: [],
                ui: ['something1', 'something2', 'something3'],
              },
            ],
          }),
        ]
      )
    ).toEqual({
      anotherNewFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
      catalogue: {},
      management: {},
      newFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
      },
      yetAnotherNewFeature: {
        capability1: true,
        capability2: true,
        capability3: true,
        capability4: true,
        something1: true,
        something2: true,
        something3: true,
      },
    });
  });
});
