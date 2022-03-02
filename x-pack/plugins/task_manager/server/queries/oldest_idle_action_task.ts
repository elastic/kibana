/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from 'kibana/server';

/**
 * Returns the millisecond timestamp of the oldest action task that may still be executed (with a 24 hour delay).
 * Useful for cleaning up related objects that may no longer be needed.
 * @internal
 */
export const getOldestIdleActionTask = async (
  client: Pick<ElasticsearchClient, 'search'>,
  taskManagerIndex: string
): Promise<string> => {
  // Default is now - 24h
  const oneDayAgo = `now-24h`;

  const response = await (client as ElasticsearchClient).search<{ task: { runAt: string } }>(
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

  if ((response as { error?: { status: number } }).error?.status === 404) {
    // If the index doesn't exist, fallback to default
    return oneDayAgo;
  } else if (response.hits?.hits?.length > 0) {
    // If there is a search result, return it's task.runAt field
    // If there is a search result but it has no task.runAt, assume something has gone very wrong and return 0 as a safe value
    // 0 should be safest since no docs should get filtered out
    const runAt = response.hits.hits[0]._source?.task?.runAt;
    return runAt ? `${runAt}||-24h` : `0`;
  } else {
    // If no results, fallback to default
    return oneDayAgo;
  }
};
