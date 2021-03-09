/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse7 } from '../../../ml/common';

import type { EsIndex } from '../types/es_index';
import { isPopulatedObject } from '../utils/object_utils';

// To be able to use the type guards on the client side, we need to make sure we don't import
// the code of '@kbn/config-schema' but just its types, otherwise the client side code will
// fail to build.
import type { FieldHistogramsResponseSchema } from './field_histograms';
import type { GetTransformsAuditMessagesResponseSchema } from './audit_messages';
import type { DeleteTransformsResponseSchema } from './delete_transforms';
import type { StartTransformsResponseSchema } from './start_transforms';
import type { StopTransformsResponseSchema } from './stop_transforms';
import type {
  GetTransformsResponseSchema,
  PostTransformsPreviewResponseSchema,
  PutTransformsResponseSchema,
} from './transforms';
import type { GetTransformsStatsResponseSchema } from './transforms_stats';
import type { PostTransformsUpdateResponseSchema } from './update_transforms';

const isGenericResponseSchema = <T>(arg: any): arg is T => {
  return (
    isPopulatedObject(arg) &&
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'transforms') &&
    Array.isArray(arg.transforms)
  );
};

export const isGetTransformsResponseSchema = (arg: any): arg is GetTransformsResponseSchema => {
  return isGenericResponseSchema<GetTransformsResponseSchema>(arg);
};

export const isGetTransformsStatsResponseSchema = (
  arg: any
): arg is GetTransformsStatsResponseSchema => {
  return isGenericResponseSchema<GetTransformsStatsResponseSchema>(arg);
};

export const isDeleteTransformsResponseSchema = (
  arg: any
): arg is DeleteTransformsResponseSchema => {
  return (
    isPopulatedObject(arg) &&
    Object.values(arg).every((d) => ({}.hasOwnProperty.call(d, 'transformDeleted')))
  );
};

export const isEsIndices = (arg: any): arg is EsIndex[] => {
  return Array.isArray(arg);
};

export const isEsSearchResponse = (arg: any): arg is SearchResponse7 => {
  return isPopulatedObject(arg) && {}.hasOwnProperty.call(arg, 'hits');
};

export const isFieldHistogramsResponseSchema = (arg: any): arg is FieldHistogramsResponseSchema => {
  return Array.isArray(arg);
};

export const isGetTransformsAuditMessagesResponseSchema = (
  arg: any
): arg is GetTransformsAuditMessagesResponseSchema => {
  return Array.isArray(arg);
};

export const isPostTransformsPreviewResponseSchema = (
  arg: any
): arg is PostTransformsPreviewResponseSchema => {
  return (
    isPopulatedObject(arg) &&
    {}.hasOwnProperty.call(arg, 'generated_dest_index') &&
    {}.hasOwnProperty.call(arg, 'preview') &&
    typeof arg.generated_dest_index !== undefined &&
    Array.isArray(arg.preview)
  );
};

export const isPostTransformsUpdateResponseSchema = (
  arg: any
): arg is PostTransformsUpdateResponseSchema => {
  return isPopulatedObject(arg) && {}.hasOwnProperty.call(arg, 'id') && typeof arg.id === 'string';
};

export const isPutTransformsResponseSchema = (arg: any): arg is PutTransformsResponseSchema => {
  return (
    isPopulatedObject(arg) &&
    {}.hasOwnProperty.call(arg, 'transformsCreated') &&
    {}.hasOwnProperty.call(arg, 'errors') &&
    Array.isArray(arg.transformsCreated) &&
    Array.isArray(arg.errors)
  );
};

const isGenericSuccessResponseSchema = (arg: any) =>
  isPopulatedObject(arg) && Object.values(arg).every((d) => ({}.hasOwnProperty.call(d, 'success')));

export const isStartTransformsResponseSchema = (arg: any): arg is StartTransformsResponseSchema => {
  return isGenericSuccessResponseSchema(arg);
};

export const isStopTransformsResponseSchema = (arg: any): arg is StopTransformsResponseSchema => {
  return isGenericSuccessResponseSchema(arg);
};
