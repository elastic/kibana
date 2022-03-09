/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { EsIndex } from '../types/es_index';
import type { EsIngestPipeline } from '../types/es_ingest_pipeline';
import { isPopulatedObject } from '../shared_imports';

// To be able to use the type guards on the client side, we need to make sure we don't import
// the code of '@kbn/config-schema' but just its types, otherwise the client side code will
// fail to build.
import type { FieldHistogramsResponseSchema } from './field_histograms';
import type { GetTransformsAuditMessagesResponseSchema } from './audit_messages';
import type { DeleteTransformsResponseSchema } from './delete_transforms';
import type { ResetTransformsResponseSchema } from './reset_transforms';
import type { StartTransformsResponseSchema } from './start_transforms';
import type { StopTransformsResponseSchema } from './stop_transforms';
import type {
  GetTransformNodesResponseSchema,
  GetTransformsResponseSchema,
  PostTransformsPreviewResponseSchema,
  PutTransformsResponseSchema,
} from './transforms';
import type { GetTransformsStatsResponseSchema } from './transforms_stats';
import type { PostTransformsUpdateResponseSchema } from './update_transforms';

const isGenericResponseSchema = <T>(arg: any): arg is T => {
  return isPopulatedObject(arg, ['count', 'transforms']) && Array.isArray(arg.transforms);
};

export const isGetTransformNodesResponseSchema = (
  arg: unknown
): arg is GetTransformNodesResponseSchema => {
  return isPopulatedObject(arg, ['count']) && typeof arg.count === 'number';
};

export const isGetTransformsResponseSchema = (arg: unknown): arg is GetTransformsResponseSchema => {
  return isGenericResponseSchema<GetTransformsResponseSchema>(arg);
};

export const isGetTransformsStatsResponseSchema = (
  arg: unknown
): arg is GetTransformsStatsResponseSchema => {
  return isGenericResponseSchema<GetTransformsStatsResponseSchema>(arg);
};

export const isDeleteTransformsResponseSchema = (
  arg: unknown
): arg is DeleteTransformsResponseSchema => {
  return (
    isPopulatedObject(arg) &&
    Object.values(arg).every((d) => isPopulatedObject(d, ['transformDeleted']))
  );
};

export const isResetTransformsResponseSchema = (
  arg: unknown
): arg is ResetTransformsResponseSchema => {
  return (
    isPopulatedObject(arg) &&
    Object.values(arg).every((d) => isPopulatedObject(d, ['transformReset']))
  );
};

export const isEsIndices = (arg: unknown): arg is EsIndex[] => {
  return Array.isArray(arg);
};

export const isEsIngestPipelines = (arg: unknown): arg is EsIngestPipeline[] => {
  return Array.isArray(arg) && arg.every((d) => isPopulatedObject(d, ['name']));
};

export const isEsSearchResponse = (arg: unknown): arg is estypes.SearchResponse => {
  return isPopulatedObject(arg, ['hits']);
};

type SearchResponseWithAggregations = Required<Pick<estypes.SearchResponse, 'aggregations'>> &
  estypes.SearchResponse;
export const isEsSearchResponseWithAggregations = (
  arg: unknown
): arg is SearchResponseWithAggregations => {
  return isEsSearchResponse(arg) && {}.hasOwnProperty.call(arg, 'aggregations');
};

export const isMultiBucketAggregate = <TBucket = unknown>(
  arg: unknown
): arg is estypes.AggregationsMultiBucketAggregateBase<TBucket> => {
  return isPopulatedObject(arg, ['buckets']);
};

export const isFieldHistogramsResponseSchema = (
  arg: unknown
): arg is FieldHistogramsResponseSchema => {
  return Array.isArray(arg);
};

export const isGetTransformsAuditMessagesResponseSchema = (
  arg: unknown
): arg is GetTransformsAuditMessagesResponseSchema => {
  return Array.isArray(arg);
};

export const isPostTransformsPreviewResponseSchema = (
  arg: unknown
): arg is PostTransformsPreviewResponseSchema => {
  return (
    isPopulatedObject(arg, ['generated_dest_index', 'preview']) &&
    typeof arg.generated_dest_index !== undefined &&
    Array.isArray(arg.preview)
  );
};

export const isPostTransformsUpdateResponseSchema = (
  arg: unknown
): arg is PostTransformsUpdateResponseSchema => {
  return isPopulatedObject(arg, ['id']) && typeof arg.id === 'string';
};

export const isPutTransformsResponseSchema = (arg: unknown): arg is PutTransformsResponseSchema => {
  return (
    isPopulatedObject(arg, ['transformsCreated', 'errors']) &&
    Array.isArray(arg.transformsCreated) &&
    Array.isArray(arg.errors)
  );
};

const isGenericSuccessResponseSchema = (arg: unknown) =>
  isPopulatedObject(arg) && Object.values(arg).every((d) => isPopulatedObject(d, ['success']));

export const isStartTransformsResponseSchema = (
  arg: unknown
): arg is StartTransformsResponseSchema => {
  return isGenericSuccessResponseSchema(arg);
};

export const isStopTransformsResponseSchema = (
  arg: unknown
): arg is StopTransformsResponseSchema => {
  return isGenericSuccessResponseSchema(arg);
};
