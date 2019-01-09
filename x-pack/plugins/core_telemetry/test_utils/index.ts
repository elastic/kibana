/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IESQueryResponse, IHapiServer, ISavedObjectDoc, ITaskInstance } from '../';

export const getMockTaskInstance = (): ITaskInstance => ({ state: { runs: 0, stats: {} } });

const defaultMockSavedObjects = [
  {
    _id: 'visualization:coolviz-123',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "shell_beads"}' },
    },
  },
];

const defaultMockTaskDocs = [getMockTaskInstance()];

export const getMockCallWithInternal = (hits: ISavedObjectDoc[] = defaultMockSavedObjects) => {
  return (): Promise<IESQueryResponse> => {
    return Promise.resolve({ hits: { hits } });
  };
};

export const getMockTaskFetch = (docs: ITaskInstance[] = defaultMockTaskDocs) => {
  return () => Promise.resolve({ docs });
};

export const getMockKbnServer = (
  mockCallWithInternal = getMockCallWithInternal(),
  mockTaskFetch = getMockTaskFetch()
): IHapiServer => ({
  taskManager: {
    registerTaskDefinitions: (opts: any) => undefined,
    schedule: (opts: any) => Promise.resolve(),
    fetch: mockTaskFetch,
  },
  plugins: {
    elasticsearch: {
      getCluster: (cluster: string) => ({
        callWithInternalUser: mockCallWithInternal,
      }),
    },
    xpack_main: {},
  },
  usage: {
    collectorSet: {
      makeUsageCollector: () => '',
      register: () => undefined,
    },
  },
  config: () => ({ get: () => '' }),
});
