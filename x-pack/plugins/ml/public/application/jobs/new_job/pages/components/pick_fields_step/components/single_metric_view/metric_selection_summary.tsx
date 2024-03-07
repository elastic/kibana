/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { JobCreatorContext } from '../../../job_creator_context';
import type { SingleMetricJobCreator } from '../../../../../common/job_creator';
import type { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import type { LineChartData } from '../../../../../common/chart_loader';
import { AnomalyChart, CHART_TYPE } from '../../../charts/anomaly_chart';
import { getChartSettings } from '../../../charts/common/settings';
import { getToastNotificationService } from '../../../../../../../services/toast_notification_service';

const DTR_IDX = 0;

export const SingleMetricDetectorsSummary: FC = () => {
  const {
    jobCreator: jc,
    chartLoader,
    resultsLoader,
    chartInterval,
  } = useContext(JobCreatorContext);
  const jobCreator = jc as SingleMetricJobCreator;

  const [lineChartsData, setLineChartData] = useState<LineChartData>({});
  const [loadingData, setLoadingData] = useState(false);
  const [modelData, setModelData] = useState<ModelItem[]>([]);
  const [anomalyData, setAnomalyData] = useState<Anomaly[]>([]);

  function setResultsWrapper(results: Results) {
    const model = results.model[DTR_IDX];
    if (model !== undefined) {
      setModelData(model);
    }
    const anomalies = results.anomalies[DTR_IDX];
    if (anomalies !== undefined) {
      setAnomalyData(anomalies);
    }
  }

  useEffect(() => {
    // subscribe to progress and results
    const subscription = resultsLoader.subscribeToResults(setResultsWrapper);
    loadChart();
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultsLoader]);

  async function loadChart() {
    if (jobCreator.aggFieldPair !== null) {
      setLoadingData(true);
      try {
        const cs = getChartSettings(jobCreator, chartInterval);
        const resp: LineChartData = await chartLoader.loadLineCharts(
          jobCreator.start,
          jobCreator.end,
          [jobCreator.aggFieldPair],
          null,
          null,
          cs.intervalMs,
          jobCreator.runtimeMappings,
          jobCreator.datafeedConfig.indices_options
        );
        if (resp[DTR_IDX] !== undefined) {
          setLineChartData(resp);
        }
      } catch (error) {
        getToastNotificationService().displayErrorToast(error);
        setLineChartData({});
      }
      setLoadingData(false);
    }
  }

  return (
    <Fragment>
      {(lineChartsData[DTR_IDX] !== undefined || loadingData === true) && (
        <Fragment>
          <AnomalyChart
            chartType={CHART_TYPE.LINE}
            chartData={lineChartsData[DTR_IDX]}
            modelData={modelData}
            anomalyData={anomalyData}
            height="300px"
            width="100%"
            loading={loadingData}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
