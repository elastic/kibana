/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./epm/packages');
import type { SavedObjectsClientContract } from 'kibana/server';

import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import type { PackagePolicy, RegistryDataStream } from '../types';

import { getPackageInfo } from './epm/packages';
import {
  getDataStreamPrivileges,
  storedPackagePoliciesToAgentPermissions,
} from './package_policies_to_agent_permissions';

const getPackageInfoMock = getPackageInfo as jest.MockedFunction<typeof getPackageInfo>;

describe('storedPackagePoliciesToAgentPermissions()', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  it('Returns `undefined` if there are no package policies', async () => {
    const permissions = await storedPackagePoliciesToAgentPermissions(soClient, []);
    expect(permissions).toBeUndefined();
  });

  it('Returns the default permissions for string package policies', async () => {
    const permissions = await storedPackagePoliciesToAgentPermissions(soClient, ['foo']);
    expect(permissions).toMatchObject({
      _fallback: {
        cluster: ['monitor'],
        indices: [
          {
            names: [
              'logs-*',
              'metrics-*',
              'traces-*',
              'synthetics-*',
              '.logs-endpoint.diagnostic.collection-*',
            ],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });

  it('Returns the default permissions if a package policy does not have a package', async () => {
    const permissions = await storedPackagePoliciesToAgentPermissions(soClient, [
      { name: 'foo', package: undefined } as PackagePolicy,
    ]);

    expect(permissions).toMatchObject({
      foo: {
        cluster: ['monitor'],
        indices: [
          {
            names: [
              'logs-*',
              'metrics-*',
              'traces-*',
              'synthetics-*',
              '.logs-endpoint.diagnostic.collection-*',
            ],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });

  it('Returns the permissions for the enabled inputs', async () => {
    getPackageInfoMock.mockResolvedValueOnce({
      name: 'test-package',
      version: '0.0.0',
      latestVersion: '0.0.0',
      release: 'experimental',
      format_version: '1.0.0',
      title: 'Test Package',
      description: '',
      icons: [],
      owner: { github: '' },
      status: 'not_installed',
      assets: {
        kibana: {
          dashboard: [],
          visualization: [],
          search: [],
          index_pattern: [],
          map: [],
          lens: [],
          security_rule: [],
          ml_module: [],
          tag: [],
        },
        elasticsearch: {
          component_template: [],
          ingest_pipeline: [],
          ilm_policy: [],
          transform: [],
          index_template: [],
          data_stream_ilm_policy: [],
          ml_model: [],
        },
      },
      data_streams: [
        {
          type: 'logs',
          dataset: 'some-logs',
          title: '',
          release: '',
          package: 'test-package',
          path: '',
          ingest_pipeline: '',
          streams: [{ input: 'test-logs', title: 'Test Logs', template_path: '' }],
        },
        {
          type: 'metrics',
          dataset: 'some-metrics',
          title: '',
          release: '',
          package: 'test-package',
          path: '',
          ingest_pipeline: '',
          streams: [{ input: 'test-metrics', title: 'Test Logs', template_path: '' }],
        },
      ],
    });

    const packagePolicies: PackagePolicy[] = [
      {
        id: '12345',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test-package', version: '0.0.0', title: 'Test Package' },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
              },
            ],
          },
          {
            type: 'test-metrics',
            enabled: false,
            streams: [
              {
                id: 'test-logs',
                enabled: false,
                data_stream: { type: 'metrics', dataset: 'some-metrics' },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        output_id: '',
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(soClient, packagePolicies);
    expect(permissions).toMatchObject({
      'test-policy': {
        indices: [
          {
            names: ['logs-some-logs-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });

  it('Returns the dataset for the compiled data_streams', async () => {
    getPackageInfoMock.mockResolvedValueOnce({
      name: 'test-package',
      version: '0.0.0',
      latestVersion: '0.0.0',
      release: 'experimental',
      format_version: '1.0.0',
      title: 'Test Package',
      description: '',
      icons: [],
      owner: { github: '' },
      status: 'not_installed',
      assets: {
        kibana: {
          dashboard: [],
          visualization: [],
          search: [],
          index_pattern: [],
          map: [],
          lens: [],
          security_rule: [],
          ml_module: [],
          tag: [],
        },
        elasticsearch: {
          component_template: [],
          ingest_pipeline: [],
          ilm_policy: [],
          transform: [],
          index_template: [],
          data_stream_ilm_policy: [],
          ml_model: [],
        },
      },
      data_streams: [
        {
          type: 'logs',
          dataset: 'some-logs',
          title: '',
          release: '',
          package: 'test-package',
          path: '',
          ingest_pipeline: '',
          streams: [{ input: 'test-logs', title: 'Test Logs', template_path: '' }],
        },
      ],
    });

    const packagePolicies: PackagePolicy[] = [
      {
        id: '12345',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test-package', version: '0.0.0', title: 'Test Package' },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        output_id: '',
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(soClient, packagePolicies);
    expect(permissions).toMatchObject({
      'test-policy': {
        indices: [
          {
            names: ['logs-compiled-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });

  it('Returns the cluster privileges if there is one in the package policy', async () => {
    getPackageInfoMock.mockResolvedValueOnce({
      name: 'test-package',
      version: '0.0.0',
      latestVersion: '0.0.0',
      release: 'experimental',
      format_version: '1.0.0',
      title: 'Test Package',
      description: '',
      icons: [],
      owner: { github: '' },
      status: 'not_installed',
      assets: {
        kibana: {
          dashboard: [],
          visualization: [],
          search: [],
          index_pattern: [],
          map: [],
          lens: [],
          security_rule: [],
          ml_module: [],
          tag: [],
        },
        elasticsearch: {
          component_template: [],
          ingest_pipeline: [],
          ilm_policy: [],
          transform: [],
          index_template: [],
          data_stream_ilm_policy: [],
          ml_model: [],
        },
      },
      data_streams: [
        {
          type: 'logs',
          dataset: 'some-logs',
          title: '',
          release: '',
          package: 'test-package',
          path: '',
          ingest_pipeline: '',
          streams: [{ input: 'test-logs', title: 'Test Logs', template_path: '' }],
        },
      ],
    });

    const packagePolicies: PackagePolicy[] = [
      {
        id: '12345',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test-package', version: '0.0.0', title: 'Test Package' },
        elasticsearch: {
          privileges: {
            cluster: ['monitor'],
          },
        },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        output_id: '',
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(soClient, packagePolicies);
    expect(permissions).toMatchObject({
      'test-policy': {
        indices: [
          {
            names: ['logs-compiled-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
        cluster: ['monitor'],
      },
    });
  });

  it('Returns the dataset for osquery_manager package', async () => {
    getPackageInfoMock.mockResolvedValueOnce({
      format_version: '1.0.0',
      name: 'osquery_manager',
      title: 'Osquery Manager',
      version: '0.3.0',
      license: 'basic',
      description:
        'Centrally manage osquery deployments, run live queries, and schedule recurring queries',
      type: 'integration',
      release: 'beta',
      categories: ['security', 'os_system', 'config_management'],
      icons: [
        {
          src: '/img/logo_osquery.svg',
          title: 'logo osquery',
          size: '32x32',
          type: 'image/svg+xml',
        },
      ],
      owner: { github: 'elastic/integrations' },
      readme: '/package/osquery_manager/0.3.0/docs/README.md',
      data_streams: [
        {
          dataset: 'osquery_manager.result',
          package: 'osquery_manager',
          ingest_pipeline: 'default',
          path: 'result',
          streams: [],
          title: 'Osquery Manager queries',
          type: 'logs',
          release: 'experimental',
        },
      ],
      latestVersion: '0.3.0',
      removable: true,
      notice: undefined,
      status: 'not_installed',
      assets: {
        kibana: {
          dashboard: [],
          visualization: [],
          search: [],
          index_pattern: [],
          map: [],
          lens: [],
          security_rule: [],
          ml_module: [],
          tag: [],
        },
        elasticsearch: {
          component_template: [],
          ingest_pipeline: [],
          ilm_policy: [],
          transform: [],
          index_template: [],
          data_stream_ilm_policy: [],
          ml_model: [],
        },
      },
    });

    const packagePolicies: PackagePolicy[] = [
      {
        id: '12345',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'osquery_manager', version: '0.0.0', title: 'Test Package' },
        inputs: [
          {
            type: 'osquery_manager',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        output_id: '',
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(soClient, packagePolicies);
    expect(permissions).toMatchObject({
      'test-policy': {
        indices: [
          {
            names: ['logs-osquery_manager.result-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });
});

describe('getDataStreamPrivileges()', () => {
  it('returns defaults for a datastream with no privileges', () => {
    const dataStream = { type: 'logs', dataset: 'test' } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream);

    expect(privileges).toMatchObject({
      names: ['logs-test-*'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('adds the namespace to the index name', () => {
    const dataStream = { type: 'logs', dataset: 'test' } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-test-namespace'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('appends a wildcard if dataset is prefix', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      dataset_is_prefix: true,
    } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-test.*-namespace'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('prepends a dot if datastream is hidden', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      hidden: true,
    } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['.logs-test-namespace'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('uses custom privileges if they are present in the datastream', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      elasticsearch: {
        privileges: { indices: ['read', 'monitor'] },
      },
    } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-test-namespace'],
      privileges: ['read', 'monitor'],
    });
  });
});
