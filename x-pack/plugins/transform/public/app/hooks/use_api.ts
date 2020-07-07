/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import {
  TransformId,
  TransformEndpointRequest,
  TransformEndpointResult,
  DeleteTransformEndpointResult,
} from '../../../common';
import { API_BASE_PATH } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';
import { GetTransformsResponse, PreviewRequestBody } from '../common';

import { EsIndex } from './use_api_types';

export const useApi = () => {
  const { http } = useAppDependencies();

  return useMemo(
    () => ({
      getTransforms(transformId?: TransformId): Promise<any> {
        const transformIdString = transformId !== undefined ? `/${transformId}` : '';
        return http.get(`${API_BASE_PATH}transforms${transformIdString}`);
      },
      getTransformsStats(transformId?: TransformId): Promise<any> {
        if (transformId !== undefined) {
          return http.get(`${API_BASE_PATH}transforms/${transformId}/_stats`);
        }

        return http.get(`${API_BASE_PATH}transforms/_stats`);
      },
      createTransform(transformId: TransformId, transformConfig: any): Promise<any> {
        return http.put(`${API_BASE_PATH}transforms/${transformId}`, {
          body: JSON.stringify(transformConfig),
        });
      },
      updateTransform(transformId: TransformId, transformConfig: any): Promise<any> {
        return http.post(`${API_BASE_PATH}transforms/${transformId}/_update`, {
          body: JSON.stringify(transformConfig),
        });
      },
      deleteTransforms(
        transformsInfo: TransformEndpointRequest[],
        deleteDestIndex: boolean | undefined,
        deleteDestIndexPattern: boolean | undefined,
        forceDelete: boolean
      ): Promise<DeleteTransformEndpointResult> {
        return http.post(`${API_BASE_PATH}delete_transforms`, {
          body: JSON.stringify({
            transformsInfo,
            deleteDestIndex,
            deleteDestIndexPattern,
            forceDelete,
          }),
        });
      },
      getTransformsPreview(obj: PreviewRequestBody): Promise<GetTransformsResponse> {
        return http.post(`${API_BASE_PATH}transforms/_preview`, {
          body: JSON.stringify(obj),
        });
      },
      startTransforms(
        transformsInfo: TransformEndpointRequest[]
      ): Promise<TransformEndpointResult> {
        return http.post(`${API_BASE_PATH}start_transforms`, {
          body: JSON.stringify(transformsInfo),
        });
      },
      stopTransforms(transformsInfo: TransformEndpointRequest[]): Promise<TransformEndpointResult> {
        return http.post(`${API_BASE_PATH}stop_transforms`, {
          body: JSON.stringify(transformsInfo),
        });
      },
      getTransformAuditMessages(transformId: TransformId): Promise<any> {
        return http.get(`${API_BASE_PATH}transforms/${transformId}/messages`);
      },
      esSearch(payload: any): Promise<any> {
        return http.post(`${API_BASE_PATH}es_search`, { body: JSON.stringify(payload) });
      },
      getIndices(): Promise<EsIndex[]> {
        return http.get(`/api/index_management/indices`);
      },
    }),
    [http]
  );
};
