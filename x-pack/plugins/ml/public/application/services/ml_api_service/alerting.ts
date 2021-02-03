/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpService } from '../http_service';
import { ML_BASE_PATH } from '../../../../common/constants/app';
import { MlAnomalyThresholdAlertParams, PreviewResponse } from '../../../../common/types/alerts';

export type AlertingApiService = ReturnType<typeof alertingApiProvider>;

export const alertingApiProvider = (httpService: HttpService) => {
  return {
    preview(params: {
      alertParams: MlAnomalyThresholdAlertParams;
      timeRange: string;
    }): Promise<PreviewResponse> {
      const body = JSON.stringify(params);
      return httpService.http<any>({
        path: `${ML_BASE_PATH}/alerting/preview`,
        method: 'POST',
        body,
      });
    },
  };
};
