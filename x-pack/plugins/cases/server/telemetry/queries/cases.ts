/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, SavedObjectsFindResponse } from '@kbn/core/server';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { fromKueryExpression } from '@kbn/es-query';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  OWNERS,
} from '../../../common/constants';
import { ESCaseStatus } from '../../services/cases/types';
import type { ESCaseAttributes } from '../../services/cases/types';
import type {
  CollectTelemetryDataParams,
  CasesTelemetry,
  ReferencesAggregation,
  LatestDates,
  CaseAggregationResult,
  AttachmentAggregationResult,
  FileAttachmentAggregationResult,
} from '../types';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getAttachmentsFrameworkStats,
  getCountsAggregationQuery,
  getCountsFromBuckets,
  getMaxBucketOnCaseAggregationQuery,
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
    createdAt: savedObjects?.[0]?.saved_objects?.[0]?.attributes?.created_at ?? '',
    updatedAt: savedObjects?.[1]?.saved_objects?.[0]?.attributes?.updated_at ?? '',
    closedAt: savedObjects?.[2]?.saved_objects?.[0]?.attributes?.closed_at ?? '',
  };
};

export const getCasesTelemetryData = async ({
  savedObjectsClient,
  logger,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['cases']> => {
  try {
    const [casesRes, commentsRes, totalAlertsRes, totalConnectorsRes, latestDates, filesRes] =
      await Promise.all([
        getCasesSavedObjectTelemetry(savedObjectsClient),
        getCommentsSavedObjectTelemetry(savedObjectsClient),
        getAlertsTelemetry(savedObjectsClient),
        getConnectorsTelemetry(savedObjectsClient),
        getLatestCasesDates({ savedObjectsClient, logger }),
        getFilesTelemetry(savedObjectsClient),
      ]);

    const aggregationsBuckets = getAggregationsBuckets({
      aggs: casesRes.aggregations,
      keys: ['counts', 'syncAlerts', 'status', 'users', 'totalAssignees'],
    });

    const allAttachmentFrameworkStats = getAttachmentsFrameworkStats({
      attachmentAggregations: commentsRes.aggregations,
      totalCasesForOwner: casesRes.total,
      filesAggregations: filesRes.aggregations,
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
        ...allAttachmentFrameworkStats,
      },
      sec: getSolutionValues({
        caseAggregations: casesRes.aggregations,
        attachmentAggregations: commentsRes.aggregations,
        filesAggregations: filesRes.aggregations,
        owner: 'securitySolution',
      }),
      obs: getSolutionValues({
        caseAggregations: casesRes.aggregations,
        attachmentAggregations: commentsRes.aggregations,
        filesAggregations: filesRes.aggregations,
        owner: 'observability',
      }),
      main: getSolutionValues({
        caseAggregations: casesRes.aggregations,
        attachmentAggregations: commentsRes.aggregations,
        filesAggregations: filesRes.aggregations,
        owner: 'cases',
      }),
    };
  } catch (error) {
    logger.error(`Cases telemetry failed with error: ${error}`);
    throw error;
  }
};

const getCasesSavedObjectTelemetry = async (
  savedObjectsClient: ISavedObjectsRepository
): Promise<SavedObjectsFindResponse<unknown, CaseAggregationResult>> => {
  const caseByOwnerAggregationQuery = OWNERS.reduce(
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

  return savedObjectsClient.find<unknown, CaseAggregationResult>({
    page: 0,
    perPage: 0,
    type: CASE_SAVED_OBJECT,
    aggs: {
      ...caseByOwnerAggregationQuery,
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

const getCommentsSavedObjectTelemetry = async (
  savedObjectsClient: ISavedObjectsRepository
): Promise<SavedObjectsFindResponse<unknown, AttachmentAggregationResult>> => {
  const attachmentRegistries = () => ({
    externalReferenceTypes: {
      terms: {
        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.externalReferenceAttachmentTypeId`,
      },
      aggs: {
        ...getMaxBucketOnCaseAggregationQuery(CASE_COMMENT_SAVED_OBJECT),
      },
    },
    persistableReferenceTypes: {
      terms: {
        field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.persistableStateAttachmentTypeId`,
      },
      aggs: {
        ...getMaxBucketOnCaseAggregationQuery(CASE_COMMENT_SAVED_OBJECT),
      },
    },
  });

  const attachmentsByOwnerAggregationQuery = OWNERS.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${CASE_COMMENT_SAVED_OBJECT}.attributes.owner`]: owner,
          },
        },
        aggs: {
          ...attachmentRegistries(),
        },
      },
    }),
    {}
  );

  return savedObjectsClient.find<unknown, AttachmentAggregationResult>({
    page: 0,
    perPage: 0,
    type: CASE_COMMENT_SAVED_OBJECT,
    aggs: {
      ...attachmentsByOwnerAggregationQuery,
      ...attachmentRegistries(),
      participants: {
        cardinality: {
          field: `${CASE_COMMENT_SAVED_OBJECT}.attributes.created_by.username`,
        },
      },
    },
  });
};

const getFilesTelemetry = async (
  savedObjectsClient: ISavedObjectsRepository
): Promise<SavedObjectsFindResponse<unknown, FileAttachmentAggregationResult>> => {
  const averageSize = () => ({
    averageSize: {
      avg: {
        field: `${FILE_SO_TYPE}.attributes.size`,
      },
    },
  });

  const filesByOwnerAggregationQuery = OWNERS.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${FILE_SO_TYPE}.attributes.Meta.owner`]: owner,
          },
        },
        aggs: {
          ...averageSize(),
        },
      },
    }),
    {}
  );

  const filterCaseIdExists = fromKueryExpression(`${FILE_SO_TYPE}.attributes.Meta.caseId: *`);

  return savedObjectsClient.find<unknown, FileAttachmentAggregationResult>({
    page: 0,
    perPage: 0,
    type: FILE_SO_TYPE,
    filter: filterCaseIdExists,
    aggs: { ...filesByOwnerAggregationQuery, ...averageSize() },
  });
};

const getAlertsTelemetry = async (
  savedObjectsClient: ISavedObjectsRepository
): Promise<SavedObjectsFindResponse<unknown, ReferencesAggregation>> => {
  return savedObjectsClient.find<unknown, ReferencesAggregation>({
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
};

const getConnectorsTelemetry = async (
  savedObjectsClient: ISavedObjectsRepository
): Promise<SavedObjectsFindResponse<unknown, ReferencesAggregation>> => {
  return savedObjectsClient.find<unknown, ReferencesAggregation>({
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
};
