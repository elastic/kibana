/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraBackendLibs } from '../../../infra_types';

export const libsMock = {
  sources: {
    getSourceConfiguration: (savedObjectsClient: any, sourceId: string) => {
      return Promise.resolve({
        id: sourceId,
        configuration: {
          logAlias: 'filebeat-*',
          fields: { timestamp: '@timestamp' },
        },
      });
    },
  },
} as InfraBackendLibs;
