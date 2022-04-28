/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpService } from '../http_service';
import { ML_BASE_PATH } from '../../../../common/constants/app';
import type {
  MlAnomalyDetectionAlertParams,
  PreviewResponse,
} from '../../../../common/types/alerts';

export type AlertingApiService = ReturnType<typeof alertingApiProvider>;

export const alertingApiProvider = (httpService: HttpService) => {
  return {
    preview(params: {
      alertParams: MlAnomalyDetectionAlertParams;
      timeRange: string;
      sampleSize?: number;
    }): Promise<PreviewResponse> {
      const body = JSON.stringify(params);
      return httpService.http<PreviewResponse>({
        path: `${ML_BASE_PATH}/alerting/preview`,
        method: 'POST',
        body,
      });
    },
  };
};
