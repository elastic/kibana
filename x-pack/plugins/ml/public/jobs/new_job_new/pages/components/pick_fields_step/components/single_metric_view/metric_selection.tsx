/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { JobCreatorContext } from '../../../job_creator_context';
import {
  SingleMetricJobCreator,
  isSingleMetricJobCreator,
} from '../../../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import { LineChartData } from '../../../../../common/chart_loader';
import { AggSelect, DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { AggFieldPair } from '../../../../../../../../common/types/fields';
import { AnomalyChart } from '../../../charts/anomaly_chart';
import { JobProgress } from '../job_progress';

interface Props {
  isActive: boolean;
  setIsValid: (na: boolean) => void;
}

const DTR_IDX = 0;

export const SingleMetricDetectors: FC<Props> = ({ isActive, setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
    resultsLoader,
  } = useContext(JobCreatorContext);

  if (isSingleMetricJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as SingleMetricJobCreator;

  const { fields } = newJobCapsService;
  const [selectedOptions, setSelectedOptions] = useState<DropDownProps>([{ label: '' }]);
  const [aggFieldPair, setAggFieldPair] = useState<AggFieldPair | null>(null);
  const [lineChartsData, setLineChartData] = useState<LineChartData>([]);
  const [modelData, setModelData] = useState<ModelItem[]>([]);
  const [anomalyData, setAnomalyData] = useState<Anomaly[]>([]);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [progress, setProgress] = useState(resultsLoader.progress);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    setSelectedOptions(selectedOptionsIn);
    if (selectedOptionsIn.length) {
      const option = selectedOptionsIn[0];
      if (typeof option !== 'undefined') {
        setAggFieldPair({ agg: option.agg, field: option.field });
      } else {
        setAggFieldPair(null);
      }
    }
  }

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

  // subscribe to progress
  useEffect(() => {
    jobCreator.subscribeToProgress(setProgress);
  }, []);

  // subscribe to results
  useEffect(() => {
    resultsLoader.subscribeToResults(setResultsWrapper);
  }, []);

  useEffect(
    () => {
      if (aggFieldPair !== null) {
        jobCreator.setDetector(aggFieldPair.agg, aggFieldPair.field);
        jobCreatorUpdate();
        loadChart();
        setIsValid(aggFieldPair !== null);
      }
    },
    [aggFieldPair]
  );

  useEffect(
    () => {
      if (jobCreator.start !== start || jobCreator.end !== end) {
        setStart(jobCreator.start);
        setEnd(jobCreator.end);
        loadChart();
      }
    },
    [jobCreatorUpdated]
  );

  async function loadChart() {
    if (aggFieldPair !== null) {
      const resp: LineChartData = await chartLoader.loadLineCharts(
        jobCreator.start,
        jobCreator.end,
        [aggFieldPair],
        null,
        null,
        chartInterval.getInterval().asMilliseconds()
      );
      if (resp[DTR_IDX] !== undefined) {
        setLineChartData(resp);
      }
    }
  }

  return (
    <Fragment>
      {isActive && (
        <Fragment>
          <AggSelect
            fields={fields}
            changeHandler={detectorChangeHandler}
            selectedOptions={selectedOptions}
            removeOptions={[]}
          />
          {lineChartsData[DTR_IDX] !== undefined && (
            <AnomalyChart
              lineChartData={lineChartsData[DTR_IDX]}
              modelData={modelData}
              anomalyData={anomalyData}
              height="300px"
              width="100%"
            />
          )}
        </Fragment>
      )}
      {isActive === false && (
        <Fragment>
          {lineChartsData[DTR_IDX] !== undefined && (
            <Fragment>
              <AnomalyChart
                lineChartData={lineChartsData[DTR_IDX]}
                modelData={modelData}
                anomalyData={anomalyData}
                height="300px"
                width="100%"
              />
              <JobProgress progress={progress} />
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
