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
  datasetQualityLogsUser = 'dataset_quality_logs_user',
}

export enum DatasetQualityCustomRolename {
  datasetQualityLogsUser = 'dataset_quality_logs_user',
  datasetQualityReadUser = 'dataset_quality_read_user',
}

export const customRoles = {
  [DatasetQualityCustomRolename.datasetQualityLogsUser]: {
    elasticsearch: {
      indices: [
        {
          names: ['logs-*-*'],
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
  [DatasetQualityUsername.datasetQualityLogsUser]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [DatasetQualityCustomRolename.datasetQualityLogsUser],
  },
  [DatasetQualityUsername.readUser]: {
    customRoleNames: [DatasetQualityCustomRolename.datasetQualityReadUser],
  },
};

export const DATASET_QUALITY_TEST_PASSWORD = 'changeme';
