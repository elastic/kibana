/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useMemo, useState } from 'react';
import { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';
import { isRatioRule } from '../../../../../../common/alerting/logs/log_threshold';
import {
  GetLogAlertsChartPreviewDataAlertParamsSubset,
  getLogAlertsChartPreviewDataRequestPayloadRT,
  GetLogAlertsChartPreviewDataSuccessResponsePayload,
  getLogAlertsChartPreviewDataSuccessResponsePayloadRT,
  LOG_ALERTS_CHART_PREVIEW_DATA_PATH,
} from '../../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../../common/runtime_types';
import { ExecutionTimeRange } from '../../../../../types';
import { useTrackedPromise } from '../../../../../utils/use_tracked_promise';

interface Options {
  logViewReference: PersistedLogViewReference;
  ruleParams: GetLogAlertsChartPreviewDataAlertParamsSubset;
  buckets: number;
  executionTimeRange?: ExecutionTimeRange;
  filterSeriesByGroupName?: string;
}

export const useChartPreviewData = ({
  logViewReference,
  ruleParams,
  buckets,
  executionTimeRange,
  filterSeriesByGroupName,
}: Options) => {
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
        if (isRatioRule(ruleParams.criteria)) {
          const ratio = await Promise.all([
            callGetChartPreviewDataAPI(
              logViewReference,
              http!.fetch,
              { ...ruleParams, criteria: [...ruleParams.criteria[0]] },
              buckets,
              executionTimeRange
            ),
            callGetChartPreviewDataAPI(
              logViewReference,
              http!.fetch,
              { ...ruleParams, criteria: [...ruleParams.criteria[1]] },
              buckets,
              executionTimeRange
            ),
          ]);
          // The two array have the same length and the same time range.
          let seriesQueryA = ratio[0].data.series[0].points;
          let seriesQueryB = ratio[1].data.series[0].points;
          let seriesId = 'ratio';
          // When groupBy and a filter is applied, return the ratio only for the filtered grouped-by
          if (ruleParams.groupBy?.length && filterSeriesByGroupName) {
            seriesId = filterSeriesByGroupName;
            seriesQueryA =
              ratio[0].data.series.find((series) => series.id === filterSeriesByGroupName)
                ?.points || [];

            seriesQueryB =
              ratio[1].data.series.find((series) => series.id === filterSeriesByGroupName)
                ?.points || [];
          }

          const ratioPoints = [];
          for (let index = 0; index < seriesQueryA.length; index++) {
            const point = {
              timestamp: seriesQueryA[index].timestamp,
              value: 0,
            };
            // We follow the mathematics principle that dividing by 0 isn't possible,
            if (seriesQueryA[index].value === 0 || seriesQueryB[index].value === 0) {
              ratioPoints.push(point);
            } else {
              const ratioValue = seriesQueryA[index].value / seriesQueryB[index].value;
              ratioPoints.push({ ...point, value: ratioValue });
            }
          }
          const series = [{ id: seriesId, points: ratioPoints }];
          return { data: { series } };
        }
        return await callGetChartPreviewDataAPI(
          logViewReference,
          http!.fetch,
          ruleParams,
          buckets,
          executionTimeRange
        );
      },
      onResolve: ({ data: { series } }) => {
        setHasError(false);
        setChartPreviewData(series);
      },
      onReject: (error) => {
        setHasError(true);
      },
    },
    [logViewReference, http, ruleParams, buckets]
  );

  const isLoading = useMemo(
    () => getChartPreviewDataRequest.state === 'pending',
    [getChartPreviewDataRequest.state]
  );

  return {
    chartPreviewData,
    hasError,
    isLoading,
    getChartPreviewData,
  };
};

export const callGetChartPreviewDataAPI = async (
  logViewReference: PersistedLogViewReference,
  fetch: HttpHandler,
  alertParams: GetLogAlertsChartPreviewDataAlertParamsSubset,
  buckets: number,
  executionTimeRange?: ExecutionTimeRange
) => {
  const response = await fetch(LOG_ALERTS_CHART_PREVIEW_DATA_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogAlertsChartPreviewDataRequestPayloadRT.encode({
        data: {
          logView: logViewReference,
          alertParams,
          buckets,
          executionTimeRange,
        },
      })
    ),
    version: '1',
  });

  return decodeOrThrow(getLogAlertsChartPreviewDataSuccessResponsePayloadRT)(response);
};
