/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { of } from 'rxjs';
import moment from 'moment';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import {
  ConcreteTaskInstance,
  TaskStatus,
  TaskManagerStartContract,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../task_manager/server';

export const getMockTaskInstance = (
  overrides: Partial<ConcreteTaskInstance> = {}
): ConcreteTaskInstance => ({
  state: { runs: 0, stats: {} },
  taskType: 'test',
  params: {},
  id: '',
  scheduledAt: new Date(),
  attempts: 1,
  status: TaskStatus.Idle,
  runAt: new Date(),
  startedAt: null,
  retryAt: null,
  ownerId: null,
  ...overrides,
});

const defaultMockSavedObjects = [
  {
    _id: 'visualization:coolviz-123',
    _source: {
      type: 'visualization',
      visualization: { visState: '{"type": "shell_beads"}' },
      updated_at: moment().subtract(7, 'days').startOf('day').toString(),
    },
  },
];

const defaultMockTaskDocs = [getMockTaskInstance()];

export const getMockEs = async (
  mockCallWithInternal: LegacyAPICaller = getMockCallWithInternal()
) => {
  const client = elasticsearchServiceMock.createLegacyClusterClient();
  (client.callAsInternalUser as any) = mockCallWithInternal;
  return client;
};

export const getMockCallWithInternal = (
  hits: unknown[] = defaultMockSavedObjects
): LegacyAPICaller => {
  return ((() => {
    return Promise.resolve({ hits: { hits } });
  }) as unknown) as LegacyAPICaller;
};

export const getMockTaskFetch = (
  docs: ConcreteTaskInstance[] = defaultMockTaskDocs
): Partial<jest.Mocked<TaskManagerStartContract>> => {
  return {
    fetch: jest.fn((fetchOpts) => {
      return Promise.resolve({ docs, searchAfter: [] });
    }),
  } as Partial<jest.Mocked<TaskManagerStartContract>>;
};

export const getMockThrowingTaskFetch = (
  throws: Error
): Partial<jest.Mocked<TaskManagerStartContract>> => {
  return {
    fetch: jest.fn((fetchOpts) => {
      throw throws;
    }),
  } as Partial<jest.Mocked<TaskManagerStartContract>>;
};

export const getMockConfig = () => {
  return of({ kibana: { index: '' } });
};

export const getCluster = () => ({
  callWithInternalUser: getMockCallWithInternal(),
});
