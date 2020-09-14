/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickCluster } from './pick_cluster';
import { SAVED_OBJECT_TELEMETRY } from '../../../../common/constants';

const SAVED_OBJECT_ID = 'reportedClusterUuids';

describe('pickCluster', () => {
  it('should pick an unused cluster', async () => {
    const savedObjectsClient: any = {
      get: () => {
        return {
          attributes: {
            reportedClusterUuids: ['1'],
          },
        };
      },
      update: jest.fn(),
      create: jest.fn(),
    };
    const clusters = [
      { clusterUuid: '1', clusterName: '' },
      { clusterUuid: '2', clusterName: '' },
    ];
    const result = await pickCluster(clusters, savedObjectsClient);
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      SAVED_OBJECT_TELEMETRY,
      SAVED_OBJECT_ID,
      {
        reportedClusterUuids: ['1', '2'],
      }
    );
    expect(result).toStrictEqual({ clusterUuid: '2', clusterName: '' });
  });

  it('should create the saved object, if none exist', async () => {
    const savedObjectsClient: any = {
      get: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
    const clusters = [
      { clusterUuid: '1', clusterName: '' },
      { clusterUuid: '2', clusterName: '' },
      { clusterUuid: '3', clusterName: '' },
    ];
    const result = await pickCluster(clusters, savedObjectsClient);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      SAVED_OBJECT_TELEMETRY,
      {
        reportedClusterUuids: ['1'],
      },
      { id: SAVED_OBJECT_ID }
    );
    expect(result).toStrictEqual({ clusterUuid: '1', clusterName: '' });
  });

  it('should delete the saved object, if all clusters have been used', async () => {
    const savedObjectsClient: any = {
      get: () => {
        return {
          attributes: {
            reportedClusterUuids: ['1', '2', '3'],
          },
        };
      },
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    const clusters = [
      { clusterUuid: '1', clusterName: '' },
      { clusterUuid: '2', clusterName: '' },
      { clusterUuid: '3', clusterName: '' },
    ];
    const result = await pickCluster(clusters, savedObjectsClient);
    expect(savedObjectsClient.delete).toHaveBeenCalledWith(SAVED_OBJECT_TELEMETRY, SAVED_OBJECT_ID);
    expect(result).toStrictEqual({ clusterUuid: '1', clusterName: '' });
  });
});
