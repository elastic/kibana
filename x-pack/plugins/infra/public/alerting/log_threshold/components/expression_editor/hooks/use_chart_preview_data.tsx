/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState } from 'react';
import type { HttpHandler } from '../../../../../../../../../src/core/public/http/types';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public/context/context';
import type {
  GetLogAlertsChartPreviewDataAlertParamsSubset,
  GetLogAlertsChartPreviewDataSuccessResponsePayload,
} from '../../../../../../common/http_api/log_alerts/chart_preview_data';
import {
  getLogAlertsChartPreviewDataRequestPayloadRT,
  getLogAlertsChartPreviewDataSuccessResponsePayloadRT,
  LOG_ALERTS_CHART_PREVIEW_DATA_PATH,
} from '../../../../../../common/http_api/log_alerts/chart_preview_data';
import { decodeOrThrow } from '../../../../../../common/runtime_types';
import { useTrackedPromise } from '../../../../../utils/use_tracked_promise';

interface Options {
  sourceId: string;
  alertParams: GetLogAlertsChartPreviewDataAlertParamsSubset;
  buckets: number;
}

export const useChartPreviewData = ({ sourceId, alertParams, buckets }: Options) => {
  const { http } = useKibana().services;

  const [chartPreviewData, setChartPreviewData] = useState<
    GetLogAlertsChartPreviewDataSuccessResponsePayload['data']['series']
  >([]);
  const [hasError, setHasError] = useState<boolean>(false);
  const [getChartPreviewDataRequest, getChartPreviewData] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        setHasError(false);
        return await callGetChartPreviewDataAPI(sourceId, http!.fetch, alertParams, buckets);
      },
      onResolve: ({ data: { series } }) => {
        setHasError(false);
        setChartPreviewData(series);
      },
      onReject: (error) => {
        setHasError(true);
      },
    },
    [sourceId, http, alertParams, buckets]
  );

  const isLoading = useMemo(() => getChartPreviewDataRequest.state === 'pending', [
    getChartPreviewDataRequest.state,
  ]);

  return {
    chartPreviewData,
    hasError,
    isLoading,
    getChartPreviewData,
  };
};

export const callGetChartPreviewDataAPI = async (
  sourceId: string,
  fetch: HttpHandler,
  alertParams: GetLogAlertsChartPreviewDataAlertParamsSubset,
  buckets: number
) => {
  const response = await fetch(LOG_ALERTS_CHART_PREVIEW_DATA_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogAlertsChartPreviewDataRequestPayloadRT.encode({
        data: {
          sourceId,
          alertParams,
          buckets,
        },
      })
    ),
  });

  return decodeOrThrow(getLogAlertsChartPreviewDataSuccessResponsePayloadRT)(response);
};
