/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./get', () => ({ getPackageInfo: jest.fn(async () => ({})) }));

import type { SavedObjectsClientContract } from 'kibana/server';

import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import type { PackageInfo, RegistryDataStream } from '../../../types';

import { getPackagePermissions } from './permissions';
import { getPackageInfo } from './get';

const getPackageInfoMock = getPackageInfo as jest.MockedFunction<typeof getPackageInfo>;

const PACKAGE = 'test_package';
const VERSION = '1.0.0';

function createFakePackage(props: Partial<PackageInfo> = {}): PackageInfo {
  const name = PACKAGE;
  const version = VERSION;

  return {
    name,
    version,
    latestVersion: version,
    release: 'experimental',
    format_version: '1.0.0',
    title: name,
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
      },
      elasticsearch: {
        component_template: [],
        ingest_pipeline: [],
        ilm_policy: [],
        transform: [],
        index_template: [],
        data_stream_ilm_policy: [],
      },
    },
    ...props,
  } as PackageInfo;
}

function createFakeDataset(
  type: 'logs' | 'metrics' | 'traces' | 'synthetics',
  dataset: string,
  props: Partial<RegistryDataStream> = {}
): RegistryDataStream {
  return {
    type,
    dataset,
    title: dataset,
    package: PACKAGE,
    release: VERSION,
    path: `/${dataset}/`,
    ingest_pipeline: '',
    ...props,
  };
}

describe('epm/permissions', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    getPackageInfoMock.mockReset();
  });

  describe('getPackagePermissions()', () => {
    it('Returns `undefined` if package does not have datasets', async () => {
      getPackageInfoMock.mockResolvedValueOnce(createFakePackage());

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION);
      expect(permissions).toBeUndefined();
    });

    it('Returns empty permissions if datasets are empty', async () => {
      getPackageInfoMock.mockResolvedValueOnce(createFakePackage({ data_streams: [] }));
      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION);
      expect(permissions).toMatchObject({ cluster: [], indices: [] });
    });

    it('Returns default permissions', async () => {
      getPackageInfoMock.mockResolvedValueOnce(
        createFakePackage({
          data_streams: [createFakeDataset('logs', 'dataset')],
        })
      );

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION);
      expect(permissions).toMatchObject({
        cluster: ['monitor'],
        indices: [
          {
            names: ['logs-dataset-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      });
    });

    it('Returns default permissions for multiple datasets', async () => {
      getPackageInfoMock.mockResolvedValueOnce(
        createFakePackage({
          data_streams: [
            createFakeDataset('logs', 'dataset1'),
            createFakeDataset('metrics', 'dataset2'),
          ],
        })
      );

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION);
      expect(permissions).toMatchObject({
        cluster: ['monitor'],
        indices: [
          {
            names: ['logs-dataset1-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
          {
            names: ['metrics-dataset2-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      });
    });

    it('Passes the namespace to the datasets', async () => {
      getPackageInfoMock.mockResolvedValueOnce(
        createFakePackage({
          data_streams: [createFakeDataset('logs', 'dataset')],
        })
      );

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION, 'test');
      expect(permissions).toMatchObject({
        cluster: ['monitor'],
        indices: [
          {
            names: ['logs-dataset-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      });
    });

    it('Handles hidden datasets', async () => {
      getPackageInfoMock.mockResolvedValueOnce(
        createFakePackage({
          data_streams: [createFakeDataset('logs', 'dataset', { hidden: true })],
        })
      );

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION);
      expect(permissions).toMatchObject({
        cluster: ['monitor'],
        indices: [
          {
            names: ['.logs-dataset-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      });
    });

    it('Handles prefix datasets', async () => {
      getPackageInfoMock.mockResolvedValueOnce(
        createFakePackage({
          data_streams: [createFakeDataset('logs', 'dataset', { dataset_is_prefix: true })],
        })
      );

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION, 'test');
      expect(permissions).toMatchObject({
        cluster: ['monitor'],
        indices: [
          {
            names: ['logs-dataset-test-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      });
    });

    it('Aggregates cluster permissions from the different datasets', async () => {
      getPackageInfoMock.mockResolvedValueOnce(
        createFakePackage({
          data_streams: [
            createFakeDataset('logs', 'dataset', { permissions: { cluster: ['foo', 'bar'] } }),
            createFakeDataset('metrics', 'dataset', { permissions: { cluster: ['foo', 'baz'] } }),
          ],
        })
      );

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION);
      expect(permissions).toMatchObject({
        cluster: ['foo', 'bar', 'baz'],
        indices: [
          {
            names: ['logs-dataset-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
          {
            names: ['metrics-dataset-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      });
    });

    it('Configures indices permissions for each datasetdatasets', async () => {
      getPackageInfoMock.mockResolvedValueOnce(
        createFakePackage({
          data_streams: [
            createFakeDataset('logs', 'dataset', { permissions: { indices: ['foo', 'bar'] } }),
            createFakeDataset('metrics', 'dataset', { permissions: { indices: ['foo', 'baz'] } }),
          ],
        })
      );

      const permissions = await getPackagePermissions(soClient, PACKAGE, VERSION);
      expect(permissions).toMatchObject({
        cluster: ['monitor'],
        indices: [
          {
            names: ['logs-dataset-*'],
            privileges: ['foo', 'bar'],
          },
          {
            names: ['metrics-dataset-*'],
            privileges: ['foo', 'baz'],
          },
        ],
      });
    });
  });
});
