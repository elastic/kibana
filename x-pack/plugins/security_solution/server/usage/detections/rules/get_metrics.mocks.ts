/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsFindResponse } from 'kibana/server';
import type { AlertAggs } from '../../types';
import { CommentAttributes, CommentType } from '../../../../../cases/common/api/cases/comment';

export const getMockRuleAlertsResponse = (docCount: number): SearchResponse<never, AlertAggs> => ({
  took: 7,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 7322,
      relation: 'eq',
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    buckets: {
      after_key: {
        detectionAlerts: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
      },
      buckets: [
        {
          key: {
            detectionAlerts: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
          },
          doc_count: docCount,
        },
      ],
    },
  },
});

export const getMockAlertCaseCommentsResponse = (): SavedObjectsFindResponse<
  Partial<CommentAttributes>,
  never
> => ({
  page: 1,
  per_page: 10000,
  total: 4,
  saved_objects: [
    {
      type: 'cases-comments',
      id: '3bb5cc10-9249-11eb-85b7-254c8af1a983',
      attributes: {
        type: CommentType.alert,
        alertId: '54802763917f521249c9f68d0d4be0c26cc538404c26dfed1ae7dcfa94ea2226',
        index: '.siem-signals-default-000001',
        rule: {
          id: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
          name: 'Azure Diagnostic Settings Deletion',
        },
        created_at: '2021-03-31T17:47:59.449Z',
        created_by: {
          email: '',
          full_name: '',
          username: '',
        },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      },
      references: [
        {
          type: 'cases',
          name: 'associated-cases',
          id: '3a3a4fa0-9249-11eb-85b7-254c8af1a983',
        },
      ],
      migrationVersion: {},
      coreMigrationVersion: '8.0.0',
      updated_at: '2021-03-31T17:47:59.818Z',
      version: 'WzI3MDIyODMsNF0=',
      namespaces: ['default'],
      score: 0,
    },
  ],
});

export const getEmptySavedObjectResponse = (): SavedObjectsFindResponse<never, never> => ({
  page: 1,
  per_page: 1_000,
  total: 0,
  saved_objects: [],
});
