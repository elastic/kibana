/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useMemo } from 'react';
import { AlertsContext } from '../editor';
import { useTrackedPromise } from '../../../../../utils/use_tracked_promise';
import {
  GetLogAlertsChartPreviewDataSuccessResponsePayload,
  getLogAlertsChartPreviewDataSuccessResponsePayloadRT,
  getLogAlertsChartPreviewDataRequestPayloadRT,
  LOG_ALERTS_CHART_PREVIEW_DATA_PATH,
} from '../../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../../common/runtime_types';
import { GetLogAlertsChartPreviewDataAlertParamsSubset } from '../../../../../../common/http_api/log_alerts/';

interface Options {
  sourceId: string;
  context: AlertsContext;
  alertParams: GetLogAlertsChartPreviewDataAlertParamsSubset;
  buckets: number;
}

export const useChartPreviewData = ({ context, sourceId, alertParams, buckets }: Options) => {
  const [chartPreviewData, setChartPreviewData] = useState<
    GetLogAlertsChartPreviewDataSuccessResponsePayload['data']['series']
  >([]);
  const [hasError, setHasError] = useState<boolean>(false);
  const [getChartPreviewDataRequest, getChartPreviewData] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        setHasError(false);
        return await callGetChartPreviewDataAPI(sourceId, context.http.fetch, alertParams, buckets);
      },
      onResolve: ({ data: { series } }) => {
        setHasError(false);
        setChartPreviewData(series);
      },
      onReject: (error) => {
        setHasError(true);
      },
    },
    [sourceId, context.http.fetch, alertParams, buckets]
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
  fetch: AlertsContext['http']['fetch'],
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
