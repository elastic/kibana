/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';

export interface RawDoc {
  _id: string;
  _source: any;
  _type?: string;
}

export interface SearchResults {
  hits: {
    hits: RawDoc[];
  };
}

export type DeprecatedConcreteTaskInstance = Omit<ConcreteTaskInstance, 'schedule'> & {
  interval: string;
};

export type SerializedConcreteTaskInstance<State = string, Params = string> = Omit<
  ConcreteTaskInstance,
  'state' | 'params' | 'scheduledAt' | 'startedAt' | 'retryAt' | 'runAt'
> & {
  state: State;
  params: Params;
  scheduledAt: string;
  startedAt: string | null;
  retryAt: string | null;
  runAt: string;
};

export function scheduleTask(
  supertest: any,
  task: Partial<ConcreteTaskInstance | DeprecatedConcreteTaskInstance>
): Promise<SerializedConcreteTaskInstance> {
  return supertest
    .post('/api/sample_tasks/schedule')
    .set('kbn-xsrf', 'xxx')
    .send({ task })
    .expect(200)
    .then((response: { body: SerializedConcreteTaskInstance }) => response.body);
}

export function currentTasks<State = unknown, Params = unknown>(
  supertest: any
): Promise<{
  docs: Array<SerializedConcreteTaskInstance<State, Params>>;
}> {
  return supertest
    .get('/api/sample_tasks')
    .expect(200)
    .then((response: any) => response.body);
}

export async function historyDocs({
  es,
  index,
  taskId,
  taskType,
}: {
  es: any;
  index: string;
  taskId?: string;
  taskType?: string;
}): Promise<RawDoc[]> {
  const filter: any[] = [{ term: { type: 'task' } }];
  if (taskId) {
    filter.push({ term: { taskId } });
  }
  if (taskType) {
    filter.push({ term: { taskType } });
  }
  return es
    .search({
      index,
      query: {
        bool: {
          filter,
        },
      },
    })
    .then((result: any) => (result as unknown as SearchResults).hits.hits);
}
