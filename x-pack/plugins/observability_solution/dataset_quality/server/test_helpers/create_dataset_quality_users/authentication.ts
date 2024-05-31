/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum DatasetQualityUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
  datasetQualityLogsUser = 'dataset_quality_logs_user',
}

export enum DatasetQualityCustomRolename {
  datasetQualityLogsUser = 'dataset_quality_logs_user',
}

export const customRoles = {
  [DatasetQualityCustomRolename.datasetQualityLogsUser]: {
    elasticsearch: {
      indices: [
        {
          names: ['logs-*-*'],
          privileges: ['monitor'],
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
};

export const DATASET_QUALITY_TEST_PASSWORD = 'changeme';
