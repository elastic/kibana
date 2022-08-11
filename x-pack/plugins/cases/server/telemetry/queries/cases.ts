/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import { ESCaseAttributes } from '../../services/cases/types';
import {
  CollectTelemetryDataParams,
  Buckets,
  CasesTelemetry,
  Cardinality,
  ReferencesAggregation,
  LatestDates,
} from '../types';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getCountsAggregationQuery,
  getCountsFromBuckets,
  getOnlyAlertsCommentsFilter,
  getOnlyConnectorsFilter,
  getReferencesAggregationQuery,
} from './utils';

export const getLatestCasesDates = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<LatestDates> => {
  const find = async (sortField: string) =>
    savedObjectsClient.find<ESCaseAttributes>({
      page: 1,
      perPage: 1,
      sortField,
      sortOrder: 'desc',
      type: CASE_SAVED_OBJECT,
    });

  const savedObjects = await Promise.all([
    find('created_at'),
    find('updated_at'),
    find('closed_at'),
  ]);

  return {
    createdAt: savedObjects?.[0].saved_objects?.[0].attributes?.created_at ?? null,
    updatedAt: savedObjects?.[1].saved_objects?.[0].attributes?.updated_at ?? null,
    closedAt: savedObjects?.[2].saved_objects?.[0].attributes?.closed_at ?? null,
  };
};

export const getCasesTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['cases']> => {
  const owners = ['observability', 'securitySolution', 'cases'] as const;
  const byOwnerAggregationQuery = owners.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${CASE_SAVED_OBJECT}.attributes.owner`]: owner,
          },
        },
        aggs: getCountsAggregationQuery(CASE_SAVED_OBJECT),
      },
    }),
    {}
  );

  const casesRes = await savedObjectsClient.find<
    unknown,
    Record<typeof owners[number], { counts: Buckets }> & {
      counts: Buckets;
      syncAlerts: Buckets;
      status: Buckets;
      users: Cardinality;
      tags: Cardinality;
    }
  >({
    page: 0,
    perPage: 0,
    type: CASE_SAVED_OBJECT,
    aggs: {
      ...byOwnerAggregationQuery,
      ...getCountsAggregationQuery(CASE_SAVED_OBJECT),
      totalsByOwner: {
        terms: { field: `${CASE_SAVED_OBJECT}.attributes.owner` },
      },
      syncAlerts: {
        terms: { field: `${CASE_SAVED_OBJECT}.attributes.settings.syncAlerts` },
      },
      status: {
        terms: {
          field: `${CASE_SAVED_OBJECT}.attributes.status`,
        },
      },
      users: {
        cardinality: {
          field: `${CASE_SAVED_OBJECT}.attributes.created_by.username`,
        },
      },
      tags: {
        cardinality: {
          field: `${CASE_SAVED_OBJECT}.attributes.tags`,
        },
      },
    },
  });

  const commentsRes = await savedObjectsClient.find<
    unknown,
    Record<typeof owners[number], { counts: Buckets }> & {
      participants: Cardinality;
    } & ReferencesAggregation
  >({
    page: 0,
    perPage: 0,
    type: CASE_COMMENT_SAVED_OBJECT,
    aggs: {
      participants: {
        cardinality: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.created_by.username`,
        },
      },
    },
  });

  const totalAlertsRes = await savedObjectsClient.find<unknown, ReferencesAggregation>({
    page: 0,
    perPage: 0,
    type: CASE_COMMENT_SAVED_OBJECT,
    filter: getOnlyAlertsCommentsFilter(),
    aggs: {
      ...getReferencesAggregationQuery({
        savedObjectType: CASE_COMMENT_SAVED_OBJECT,
        referenceType: 'cases',
        agg: 'cardinality',
      }),
    },
  });

  const totalConnectorsRes = await savedObjectsClient.find<unknown, ReferencesAggregation>({
    page: 0,
    perPage: 0,
    type: CASE_USER_ACTION_SAVED_OBJECT,
    filter: getOnlyConnectorsFilter(),
    aggs: {
      ...getReferencesAggregationQuery({
        savedObjectType: CASE_USER_ACTION_SAVED_OBJECT,
        referenceType: 'cases',
        agg: 'cardinality',
      }),
    },
  });

  const latestDates = await getLatestCasesDates({ savedObjectsClient, logger });

  const aggregationsBuckets = getAggregationsBuckets({
    aggs: casesRes.aggregations,
    keys: [
      'counts',
      'observability.counts',
      'securitySolution.counts',
      'cases.counts',
      'syncAlerts',
      'status',
      'totalsByOwner',
      'users',
    ],
  });

  return {
    all: {
      total: casesRes.total,
      ...getCountsFromBuckets(aggregationsBuckets.counts),
      status: {
        open: findValueInBuckets(aggregationsBuckets.status, 'open'),
        inProgress: findValueInBuckets(aggregationsBuckets.status, 'in-progress'),
        closed: findValueInBuckets(aggregationsBuckets.status, 'closed'),
      },
      syncAlertsOn: findValueInBuckets(aggregationsBuckets.syncAlerts, 1),
      syncAlertsOff: findValueInBuckets(aggregationsBuckets.syncAlerts, 0),
      totalUsers: casesRes.aggregations?.users?.value ?? 0,
      totalParticipants: commentsRes.aggregations?.participants?.value ?? 0,
      totalTags: casesRes.aggregations?.tags?.value ?? 0,
      totalWithAlerts:
        totalAlertsRes.aggregations?.references?.referenceType?.referenceAgg?.value ?? 0,
      totalWithConnectors:
        totalConnectorsRes.aggregations?.references?.referenceType?.referenceAgg?.value ?? 0,
      latestDates,
    },
    sec: {
      total: findValueInBuckets(aggregationsBuckets.totalsByOwner, 'securitySolution'),
      ...getCountsFromBuckets(aggregationsBuckets['securitySolution.counts']),
    },
    obs: {
      total: findValueInBuckets(aggregationsBuckets.totalsByOwner, 'observability'),
      ...getCountsFromBuckets(aggregationsBuckets['observability.counts']),
    },
    main: {
      total: findValueInBuckets(aggregationsBuckets.totalsByOwner, 'cases'),
      ...getCountsFromBuckets(aggregationsBuckets['cases.counts']),
    },
  };
};
