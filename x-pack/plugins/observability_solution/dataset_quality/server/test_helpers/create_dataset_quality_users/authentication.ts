/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum DatasetQualityUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  readUser = 'readUser',
  editorUser = 'editor',
  datasetQualityMonitorUser = 'dataset_quality_monitor_user',
}

export enum DatasetQualityCustomRolename {
  datasetQualityMonitorUser = 'dataset_quality_monitor_user',
  datasetQualityReadUser = 'dataset_quality_read_user',
}

export const customRoles = {
  [DatasetQualityCustomRolename.datasetQualityMonitorUser]: {
    elasticsearch: {
      indices: [
        {
          names: ['logs-*-*', 'metrics-*-*', 'traces-*-*', 'synthetics-*-*'],
          privileges: ['monitor', 'view_index_metadata'],
        },
      ],
    },
  },
  [DatasetQualityCustomRolename.datasetQualityReadUser]: {
    elasticsearch: {
      indices: [
        {
          names: ['logs-*-*'],
          privileges: ['read'],
        },
      ],
    },
  },
};

export const users: Record<
  DatasetQualityUsername,
  {
    builtInRoleNames?: string[];
    customRoleNames?: DatasetQualityCustomRolename[];
  }
> = {
  [DatasetQualityUsername.noAccessUser]: {},
  [DatasetQualityUsername.viewerUser]: {
    builtInRoleNames: ['viewer'],
  },
  [DatasetQualityUsername.editorUser]: {
    builtInRoleNames: ['editor'],
  },
  [DatasetQualityUsername.datasetQualityMonitorUser]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [DatasetQualityCustomRolename.datasetQualityMonitorUser],
  },
  [DatasetQualityUsername.readUser]: {
    customRoleNames: [DatasetQualityCustomRolename.datasetQualityReadUser],
  },
};

export const DATASET_QUALITY_TEST_PASSWORD = 'changeme';
