/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { KueryNode } from '@kbn/es-query';
import { ISavedObjectsRepository } from '@kbn/core/server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import { Buckets, CasesTelemetry, MaxBucketOnCaseAggregation } from '../types';
import { buildFilter } from '../../client/utils';

export const getCountsAggregationQuery = (savedObjectType: string) => ({
  counts: {
    date_range: {
      field: `${savedObjectType}.attributes.created_at`,
      format: 'dd/MM/YYYY',
      ranges: [
        { from: 'now-1d', to: 'now' },
        { from: 'now-1w', to: 'now' },
        { from: 'now-1M', to: 'now' },
      ],
    },
  },
});

export const getMaxBucketOnCaseAggregationQuery = (savedObjectType: string) => ({
  references: {
    nested: {
      path: `${savedObjectType}.references`,
    },
    aggregations: {
      cases: {
        filter: {
          term: {
            [`${savedObjectType}.references.type`]: CASE_SAVED_OBJECT,
          },
        },
        aggregations: {
          ids: {
            terms: {
              field: `${savedObjectType}.references.id`,
            },
          },
          max: {
            max_bucket: {
              buckets_path: 'ids._count',
            },
          },
        },
      },
    },
  },
});

export const getReferencesAggregationQuery = ({
  savedObjectType,
  referenceType,
  agg = 'terms',
}: {
  savedObjectType: string;
  referenceType: string;
  agg?: string;
}) => ({
  references: {
    nested: {
      path: `${savedObjectType}.references`,
    },
    aggregations: {
      referenceType: {
        filter: {
          term: {
            [`${savedObjectType}.references.type`]: referenceType,
          },
        },
        aggregations: {
          referenceAgg: {
            [agg]: {
              field: `${savedObjectType}.references.id`,
            },
          },
        },
      },
    },
  },
});

export const getConnectorsCardinalityAggregationQuery = () =>
  getReferencesAggregationQuery({
    savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
    referenceType: 'action',
    agg: 'cardinality',
  });

export const getCountsFromBuckets = (buckets: Buckets['buckets']) => ({
  daily: buckets?.[2]?.doc_count ?? 0,
  weekly: buckets?.[1]?.doc_count ?? 0,
  monthly: buckets?.[0]?.doc_count ?? 0,
});

export const getCountsAndMaxData = async ({
  savedObjectsClient,
  savedObjectType,
  filter,
}: {
  savedObjectsClient: ISavedObjectsRepository;
  savedObjectType: string;
  filter?: KueryNode;
}) => {
  const res = await savedObjectsClient.find<
    unknown,
    { counts: Buckets; references: MaxBucketOnCaseAggregation['references'] }
  >({
    page: 0,
    perPage: 0,
    filter,
    type: savedObjectType,
    aggs: {
      ...getCountsAggregationQuery(savedObjectType),
      ...getMaxBucketOnCaseAggregationQuery(savedObjectType),
    },
  });

  const countsBuckets = res.aggregations?.counts?.buckets ?? [];
  const maxOnACase = res.aggregations?.references?.cases?.max?.value ?? 0;

  return {
    all: {
      total: res.total,
      ...getCountsFromBuckets(countsBuckets),
      maxOnACase,
    },
  };
};

export const getBucketFromAggregation = ({
  aggs,
  key,
}: {
  key: string;
  aggs?: Record<string, unknown>;
}): Buckets['buckets'] => (get(aggs, `${key}.buckets`) ?? []) as Buckets['buckets'];

export const findValueInBuckets = (buckets: Buckets['buckets'], value: string | number): number =>
  buckets.find(({ key }) => key === value)?.doc_count ?? 0;

export const getAggregationsBuckets = ({
  aggs,
  keys,
}: {
  keys: string[];
  aggs?: Record<string, unknown>;
}): Record<string, Buckets['buckets']> =>
  keys.reduce(
    (acc, key) => ({
      ...acc,
      [key]: getBucketFromAggregation({ aggs, key }),
    }),
    {}
  );

export const getOnlyAlertsCommentsFilter = () =>
  buildFilter({
    filters: ['alert'],
    field: 'type',
    operator: 'or',
    type: CASE_COMMENT_SAVED_OBJECT,
  });

export const getOnlyConnectorsFilter = () =>
  buildFilter({
    filters: ['connector'],
    field: 'type',
    operator: 'or',
    type: CASE_USER_ACTION_SAVED_OBJECT,
  });

export const getTelemetryDataEmptyState = (): CasesTelemetry => ({
  cases: {
    all: {
      total: 0,
      monthly: 0,
      weekly: 0,
      daily: 0,
      status: {
        open: 0,
        inProgress: 0,
        closed: 0,
      },
      syncAlertsOn: 0,
      syncAlertsOff: 0,
      totalUsers: 0,
      totalParticipants: 0,
      totalTags: 0,
      totalWithAlerts: 0,
      totalWithConnectors: 0,
      latestDates: {
        createdAt: null,
        updatedAt: null,
        closedAt: null,
      },
    },
    sec: { total: 0, monthly: 0, weekly: 0, daily: 0 },
    obs: { total: 0, monthly: 0, weekly: 0, daily: 0 },
    main: { total: 0, monthly: 0, weekly: 0, daily: 0 },
  },
  userActions: { all: { total: 0, monthly: 0, weekly: 0, daily: 0, maxOnACase: 0 } },
  comments: { all: { total: 0, monthly: 0, weekly: 0, daily: 0, maxOnACase: 0 } },
  alerts: { all: { total: 0, monthly: 0, weekly: 0, daily: 0, maxOnACase: 0 } },
  connectors: {
    all: {
      all: { totalAttached: 0 },
      itsm: { totalAttached: 0 },
      sir: { totalAttached: 0 },
      jira: { totalAttached: 0 },
      resilient: { totalAttached: 0 },
      swimlane: { totalAttached: 0 },
      maxAttachedToACase: 0,
    },
  },
  pushes: {
    all: { total: 0, maxOnACase: 0 },
  },
  configuration: {
    all: {
      closure: {
        manually: 0,
        automatic: 0,
      },
    },
  },
});
