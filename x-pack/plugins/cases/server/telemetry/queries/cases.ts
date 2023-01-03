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
import { ESCaseStatus } from '../../services/cases/types';
import type { ESCaseAttributes } from '../../services/cases/types';
import { OWNERS } from '../constants';
import type {
  CollectTelemetryDataParams,
  Buckets,
  CasesTelemetry,
  Cardinality,
  ReferencesAggregation,
  LatestDates,
  CaseAggregationResult,
} from '../types';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getCountsAggregationQuery,
  getCountsFromBuckets,
  getOnlyAlertsCommentsFilter,
  getOnlyConnectorsFilter,
  getReferencesAggregationQuery,
  getSolutionValues,
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
  const byOwnerAggregationQuery = OWNERS.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${CASE_SAVED_OBJECT}.attributes.owner`]: owner,
          },
        },
        aggs: {
          ...getCountsAggregationQuery(CASE_SAVED_OBJECT),
          ...getAssigneesAggregations(),
        },
      },
    }),
    {}
  );

  const casesRes = await savedObjectsClient.find<unknown, CaseAggregationResult>({
    page: 0,
    perPage: 0,
    type: CASE_SAVED_OBJECT,
    aggs: {
      ...byOwnerAggregationQuery,
      ...getCountsAggregationQuery(CASE_SAVED_OBJECT),
      ...getAssigneesAggregations(),
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
    Record<typeof OWNERS[number], { counts: Buckets }> & {
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
    keys: ['counts', 'syncAlerts', 'status', 'users', 'totalAssignees'],
  });

  return {
    all: {
      total: casesRes.total,
      ...getCountsFromBuckets(aggregationsBuckets.counts),
      status: {
        open: findValueInBuckets(aggregationsBuckets.status, ESCaseStatus.OPEN),
        inProgress: findValueInBuckets(aggregationsBuckets.status, ESCaseStatus.IN_PROGRESS),
        closed: findValueInBuckets(aggregationsBuckets.status, ESCaseStatus.CLOSED),
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
      assignees: {
        total: casesRes.aggregations?.totalAssignees.value ?? 0,
        totalWithZero: casesRes.aggregations?.assigneeFilters.buckets.zero.doc_count ?? 0,
        totalWithAtLeastOne:
          casesRes.aggregations?.assigneeFilters.buckets.atLeastOne.doc_count ?? 0,
      },
    },
    sec: getSolutionValues(casesRes.aggregations, 'securitySolution'),
    obs: getSolutionValues(casesRes.aggregations, 'observability'),
    main: getSolutionValues(casesRes.aggregations, 'cases'),
  };
};

const getAssigneesAggregations = () => ({
  totalAssignees: {
    value_count: {
      field: `${CASE_SAVED_OBJECT}.attributes.assignees.uid`,
    },
  },
  assigneeFilters: {
    filters: {
      filters: {
        zero: {
          bool: {
            must_not: {
              exists: {
                field: `${CASE_SAVED_OBJECT}.attributes.assignees.uid`,
              },
            },
          },
        },
        atLeastOne: {
          bool: {
            filter: {
              exists: {
                field: `${CASE_SAVED_OBJECT}.attributes.assignees.uid`,
              },
            },
          },
        },
      },
    },
  },
});
