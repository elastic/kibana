/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { installTransformForDataset } from './install';
import { SavedObjectsClientContract } from 'kibana/server';
import { CallESAsCurrentUser, Installation } from '../../../../types';
import Packages from '../../packages';
import Install from '../../packages/install';
import Common from './common';

jest.mock('../../packages', () => {
  return {
    Packages: jest.fn().mockImplementation(() => {
      return { getInstallation: jest.fn() };
    }),
  };
});

jest.mock('../../packages/install', () => {
  return {
    Install: jest.fn().mockImplementation(() => {
      return { saveInstalledEsRefs: jest.fn() };
    }),
  };
});

jest.mock('./common', () => {
  return {
    Common: jest.fn().mockImplementation(() => {
      return {
        getAsset: jest.fn(),
      };
    }),
  };
});

describe('test transform install', () => {
  beforeEach(() => {});
  afterEach(() => {});
  test('can install new version and removes older version', async () => {
    const callAsCurrentUser: jest.Mocked<CallESAsCurrentUser> = jest.fn();
    const savedObjectsClient: jest.Mocked<SavedObjectsClientContract> = {
      update: jest.fn(),
    };
    const previousInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.15.0-dev.0',
          type: 'transform',
        },
      ],
    };

    const currentInstallation: Installation = {
      installed_es: [
        {
          id: 'metrics-endpoint.metadata-current-default-0.16.0-dev.0',
          type: 'transform',
        },
      ],
    };
    Common.getAsset = jest.fn().mockReturnValue('{"content": "data"}');

    Packages.getInstallation = jest
      .fn()
      .mockReturnValueOnce(previousInstallation)
      .mockReturnValueOnce(currentInstallation);

    Install.saveInstalledEsRefs = jest.fn();

    await installTransformForDataset(
      {
        name: 'endpoint',
        version: '0.16.0-dev.0',
        datasets: [
          {
            type: 'metrics',
            name: 'endpoint.metadata_current',
            title: 'Endpoint Metadata',
            release: 'experimental',
            package: 'endpoint',
            elasticsearch: {
              'index_template.mappings': {
                dynamic: false,
              },
            },
            path: 'metadata_current',
          },
        ],
      },
      [
        'endpoint-0.16.0-dev.0/dataset/metadata_current/elasticsearch/transform/current-default.json',
      ],
      callAsCurrentUser,
      savedObjectsClient
    );

    expect(callAsCurrentUser.mock.calls).toEqual([
      [
        'transport.request',
        {
          method: 'POST',
          path: '/_transform/metrics-endpoint.metadata-current-default-0.15.0-dev.0/_stop',
          query: 'force=true',
          ignore: [404],
        },
      ],
      [
        'transport.request',
        {
          method: 'DELETE',
          query: 'force=true',
          path: '_transform/metrics-endpoint.metadata-current-default-0.15.0-dev.0',
          ignore: [404, 400],
        },
      ],
      [
        'transport.request',
        {
          method: 'DELETE',
          query: 'force=true',
          path: '_transform/metrics-endpoint.metadata_current-current-default-0.16.0-dev.0',
          ignore: [404, 400],
        },
      ],
      [
        'transport.request',
        {
          method: 'PUT',
          path: '/_transform/metrics-endpoint.metadata_current-current-default-0.16.0-dev.0',
          query: 'defer_validation=true',
          body: '{"content": "data"}',
        },
      ],
      [
        'transport.request',
        {
          method: 'POST',
          path: '/_transform/metrics-endpoint.metadata_current-current-default-0.16.0-dev.0/_start',
        },
      ],
    ]);

    expect(Install.saveInstalledEsRefs.mock.calls[0][2]).toEqual([
      {
        id: 'metrics-endpoint.metadata_current-current-default-0.16.0-dev.0',
        type: 'transform',
      },
    ]);
  });
});
