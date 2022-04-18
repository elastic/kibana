/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { ML_NOTIFICATION_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { JobMessage } from '../../../common/types/audit_message';

const SIZE = 50;

interface Message {
  _index: string;
  _type: string;
  _id: string;
  _score: null | number;
  _source: JobMessage;
  sort?: any;
}

interface BoolQuery {
  bool: { [key: string]: any };
}

export function analyticsAuditMessagesProvider({ asInternalUser }: IScopedClusterClient) {
  // search for audit messages,
  // analyticsId is optional. without it, all analytics will be listed.
  async function getAnalyticsAuditMessages(analyticsId: string) {
    const query: BoolQuery = {
      bool: {
        filter: [
          {
            bool: {
              must_not: {
                term: {
                  level: 'activity',
                },
              },
              must: {
                term: {
                  job_type: 'data_frame_analytics',
                },
              },
            },
          },
        ],
      },
    };

    // if no analyticsId specified, load all of the messages
    if (analyticsId !== undefined) {
      query.bool.filter.push({
        bool: {
          should: [
            {
              term: {
                job_id: '', // catch system messages
              },
            },
            {
              term: {
                job_id: analyticsId, // messages for specified analyticsId
              },
            },
          ],
        },
      });
    }

    const body = await asInternalUser.search({
      index: ML_NOTIFICATION_INDEX_PATTERN,
      ignore_unavailable: true,
      size: SIZE,
      body: {
        sort: [{ timestamp: { order: 'desc' } }, { job_id: { order: 'asc' } }],
        query,
      },
    });

    let messages: JobMessage[] = [];
    if (typeof body.hits.total !== 'number' && body.hits.total?.value) {
      messages = (body.hits.hits as Message[]).map((hit) => hit._source);
      messages.reverse();
    }
    return messages;
  }

  return {
    getAnalyticsAuditMessages,
  };
}
