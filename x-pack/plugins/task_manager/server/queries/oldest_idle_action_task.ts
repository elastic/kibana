/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from 'kibana/server';

/**
 * Returns the timestamp of the oldest action task that may still be executed.
 * Useful for cleaning up related objects that may no longer be needed.
 * @internal
 */
export const getOldestIdleActionTask = async (
  client: Pick<ElasticsearchClient, 'search'>,
  taskManagerIndex: string
): Promise<number | string> => {
  let oldestAlertAction: number | string = Date.now();
  const response = await client.search<{ task: { runAt: string } }>(
    {
      size: 1,
      index: taskManagerIndex,
      body: {
        sort: [{ 'task.runAt': { order: 'asc' } }],
        query: {
          bool: {
            filter: {
              bool: {
                must: [
                  {
                    terms: {
                      'task.taskType': [
                        'actions:.email',
                        'actions:.index',
                        'actions:.pagerduty',
                        'actions:.swimlane',
                        'actions:.server-log',
                        'actions:.slack',
                        'actions:.webhook',
                        'actions:.servicenow',
                        'actions:.servicenow-sir',
                        'actions:.jira',
                        'actions:.resilient',
                        'actions:.teams',
                      ],
                    },
                  },
                  {
                    term: { type: 'task' },
                  },
                  {
                    term: { 'task.status': 'idle' },
                  },
                ],
              },
            },
          },
        },
      },
    },
    { ignore: [404] }
  );

  // If the index doesn't exist, fallback to default
  if ((response.body as { error?: { status: number } }).error?.status === 404) {
    return oldestAlertAction;
  }

  if (response.body?.hits?.hits?.length > 0) {
    oldestAlertAction = response.body.hits.hits[0]._source?.task.runAt ?? oldestAlertAction;
  }

  return oldestAlertAction;
};
