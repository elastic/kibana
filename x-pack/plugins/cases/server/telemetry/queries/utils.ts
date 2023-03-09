/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { KueryNode } from '@kbn/es-query';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import type {
  CaseAggregationResult,
  Buckets,
  MaxBucketOnCaseAggregation,
  SolutionTelemetry,
  AttachmentFramework,
  AttachmentAggregationResult,
  BucketsWithMaxOnCase,
  AttachmentStats,
  FileAttachmentStats,
  FileAttachmentAggregationResult,
  FileAttachmentAverageSize,
  AttachmentFrameworkAggsResult,
} from '../types';
import { buildFilter } from '../../client/utils';
import type { Owner } from '../../../common/constants/types';
import { FILE_ATTACHMENT_TYPE } from '../../../common/api';

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

export const getSolutionValues = ({
  caseAggregations,
  attachmentAggregations,
  filesAggregations,
  owner,
}: {
  caseAggregations?: CaseAggregationResult;
  attachmentAggregations?: AttachmentAggregationResult;
  filesAggregations?: FileAttachmentAggregationResult;
  owner: Owner;
}): SolutionTelemetry => {
  const aggregationsBuckets = getAggregationsBuckets({
    aggs: caseAggregations,
    keys: ['totalsByOwner', 'securitySolution.counts', 'observability.counts', 'cases.counts'],
  });

  const totalCasesForOwner = findValueInBuckets(aggregationsBuckets.totalsByOwner, owner);
  const attachmentsAggsForOwner = attachmentAggregations?.[owner];
  const fileAttachmentsForOwner = filesAggregations?.[owner];

  return {
    total: totalCasesForOwner,
    ...getCountsFromBuckets(aggregationsBuckets[`${owner}.counts`]),
    ...getAttachmentsFrameworkStats({
      attachmentAggregations: attachmentsAggsForOwner,
      filesAggregations: fileAttachmentsForOwner,
      totalCasesForOwner,
    }),
    assignees: {
      total: caseAggregations?.[owner].totalAssignees.value ?? 0,
      totalWithZero: caseAggregations?.[owner].assigneeFilters.buckets.zero.doc_count ?? 0,
      totalWithAtLeastOne:
        caseAggregations?.[owner].assigneeFilters.buckets.atLeastOne.doc_count ?? 0,
    },
  };
};

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

export const getAttachmentsFrameworkStats = ({
  attachmentAggregations,
  filesAggregations,
  totalCasesForOwner,
}: {
  attachmentAggregations?: AttachmentFrameworkAggsResult;
  filesAggregations?: FileAttachmentAverageSize;
  totalCasesForOwner: number;
}): AttachmentFramework => {
  if (!attachmentAggregations) {
    return emptyAttachmentFramework();
  }
  const averageFileSize = filesAggregations?.averageSize;

  return {
    attachmentFramework: {
      externalAttachments: getAttachmentRegistryStats(
        attachmentAggregations.externalReferenceTypes,
        totalCasesForOwner
      ),
      persistableAttachments: getAttachmentRegistryStats(
        attachmentAggregations.persistableReferenceTypes,
        totalCasesForOwner
      ),
      files: getFileAttachmentStats({
        registryResults: attachmentAggregations.externalReferenceTypes,
        averageFileSize,
        totalCasesForOwner,
      }),
    },
  };
};

const getAttachmentRegistryStats = (
  registryResults: BucketsWithMaxOnCase,
  totalCasesForOwner: number
): AttachmentStats[] => {
  const stats: AttachmentStats[] = [];

  for (const bucket of registryResults.buckets) {
    const commonFields = {
      average: calculateTypePerCaseAverage(bucket.doc_count, totalCasesForOwner),
      maxOnACase: bucket.references.cases.max.value,
      total: bucket.doc_count,
    };

    stats.push({
      type: bucket.key,
      ...commonFields,
    });
  }

  return stats;
};

const calculateTypePerCaseAverage = (typeDocCount: number, totalCases: number) => {
  if (totalCases === 0) {
    return 0;
  }

  return Math.round(typeDocCount / totalCases);
};

const getFileAttachmentStats = ({
  registryResults,
  averageFileSize,
  totalCasesForOwner,
}: {
  registryResults: BucketsWithMaxOnCase;
  averageFileSize?: number;
  totalCasesForOwner: number;
}): FileAttachmentStats => {
  const fileBucket = registryResults.buckets.find((bucket) => bucket.key === FILE_ATTACHMENT_TYPE);

  if (!fileBucket || averageFileSize == null) {
    return emptyFileAttachment();
  }

  return {
    averageSize: averageFileSize,
    average: calculateTypePerCaseAverage(fileBucket.doc_count, totalCasesForOwner),
    maxOnACase: fileBucket.references.cases.max.value,
    total: fileBucket.doc_count,
  };
};

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

const emptyAttachmentFramework = (): AttachmentFramework => ({
  attachmentFramework: {
    persistableAttachments: [],
    externalAttachments: [],
    files: emptyFileAttachment(),
  },
});

const emptyFileAttachment = (): FileAttachmentStats => ({
  average: 0,
  averageSize: 0,
  maxOnACase: 0,
  total: 0,
});
