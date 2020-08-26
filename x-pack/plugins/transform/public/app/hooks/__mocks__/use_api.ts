/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchError } from 'kibana/public';

import { PreviewRequestBody, TransformId } from '../../../../common/types/transform';
import type {
  DeleteTransformsRequestSchema,
  DeleteTransformsResponseSchema,
} from '../../../../common/api_schemas/delete_transforms';
import type {
  StartTransformsRequestSchema,
  StartTransformsResponseSchema,
} from '../../../../common/api_schemas/start_transforms';
import type {
  StopTransformsRequestSchema,
  StopTransformsResponseSchema,
} from '../../../../common/api_schemas/stop_transforms';
import type { TransformsResponseSchema } from '../../../../common/api_schemas/transforms';
import { TransformIdParamSchema } from '../../../../common/api_schemas/common';

const apiFactory = () => ({
  getTransform(params: TransformIdParamSchema): Promise<TransformsResponseSchema | HttpFetchError> {
    return new Promise((resolve, reject) => {
      resolve({ count: 0, transforms: [] });
    });
  },
  getTransforms(): Promise<TransformsResponseSchema | HttpFetchError> {
    return new Promise((resolve, reject) => {
      resolve({ count: 0, transforms: [] });
    });
  },
  getTransformsStats(transformId?: TransformId): Promise<any> {
    if (transformId !== undefined) {
      return new Promise((resolve, reject) => {
        resolve([]);
      });
    }

    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  createTransform(transformId: TransformId, transformConfig: any): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  deleteTransforms(
    reqBody: DeleteTransformsRequestSchema
  ): Promise<DeleteTransformsResponseSchema> {
    return new Promise((resolve, reject) => {
      resolve({});
    });
  },
  getTransformsPreview(obj: PreviewRequestBody): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  startTransforms(reqBody: StartTransformsRequestSchema): Promise<StartTransformsResponseSchema> {
    return new Promise((resolve, reject) => {
      resolve({});
    });
  },
  stopTransforms(
    transformsInfo: StopTransformsRequestSchema
  ): Promise<StopTransformsResponseSchema> {
    return new Promise((resolve, reject) => {
      resolve({});
    });
  },
  getTransformAuditMessages(transformId: TransformId): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  esSearch(payload: any) {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  getIndices() {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
});

export const useApi = () => {
  return apiFactory();
};
