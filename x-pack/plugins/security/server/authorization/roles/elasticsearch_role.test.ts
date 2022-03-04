/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, pick } from 'lodash';

import { KibanaFeature } from '../../../../features/server';
import { transformElasticsearchRoleToRole } from './elasticsearch_role';
import type { ElasticsearchRole } from './elasticsearch_role';

const roles = [
  {
    name: 'global-base-all',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['all'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'global-base-read',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['read'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'global-foo-all',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.all'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'global-foo-read',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.read'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-base-all',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['space_all'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-base-read',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['space_read'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-foo-all',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.all'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-foo-read',
    cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.read'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
];

function testRoles(
  testName: string,
  features: KibanaFeature[],
  elasticsearchRoles: ElasticsearchRole[],
  expected: any
) {
  const transformedRoles = elasticsearchRoles.map((role) => {
    const transformedRole = transformElasticsearchRoleToRole(
      features,
      omit(role, 'name'),
      role.name,
      'kibana-.kibana'
    );
    return pick(transformedRole, ['name', '_transform_error']);
  });

  it(`${testName}`, () => {
    expect(transformedRoles).toEqual(expected);
  });
}

describe('#transformElasticsearchRoleToRole', () => {
  const featuresWithRequireAllSpaces: KibanaFeature[] = [
    new KibanaFeature({
      id: 'foo',
      name: 'KibanaFeatureWithAllSpaces',
      app: ['kibana-.kibana'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          requireAllSpaces: true,
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
    }),
  ];
  const featuresWithReadDisabled: KibanaFeature[] = [
    new KibanaFeature({
      id: 'foo',
      name: 'Foo KibanaFeatureWithReadDisabled',
      app: ['kibana-.kibana'],
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
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    }),
  ];

  testRoles('#When features has requireAllSpaces=true', featuresWithRequireAllSpaces, roles, [
    { name: 'global-base-all', _transform_error: [] },
    { name: 'global-base-read', _transform_error: [] },
    { name: 'global-foo-all', _transform_error: [] },
    { name: 'global-foo-read', _transform_error: [] },
    { name: 'default-base-all', _transform_error: [] },
    { name: 'default-base-read', _transform_error: [] },
    { name: 'default-foo-all', _transform_error: ['kibana'] },
    { name: 'default-foo-read', _transform_error: [] },
  ]);

  testRoles(
    '#When features has requireAllSpaces=false and read disabled',
    featuresWithReadDisabled,
    roles,
    [
      { name: 'global-base-all', _transform_error: [] },
      { name: 'global-base-read', _transform_error: [] },
      { name: 'global-foo-all', _transform_error: [] },
      { name: 'global-foo-read', _transform_error: ['kibana'] },
      { name: 'default-base-all', _transform_error: [] },
      { name: 'default-base-read', _transform_error: [] },
      { name: 'default-foo-all', _transform_error: [] },
      { name: 'default-foo-read', _transform_error: ['kibana'] },
    ]
  );
});
