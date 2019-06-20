/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiButton,
  EuiComboBoxOptionProps,
} from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { MultiMetricJobCreator, isMultiMetricJobCreator } from '../../../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import { LineChartData } from '../../../../../common/chart_loader';
import { AggSelect, DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { Field, Aggregation, AggFieldPair } from '../../../../../../../../common/types/fields';
import { AnomalyChart } from '../../../charts/anomaly_chart';
import { defaultChartSettings, ChartSettings } from '../../../charts/common/settings';
import { MetricSelector } from './metric_selector';

interface Props {
  isActive: boolean;
  setIsValid: (na: boolean) => void;
}

export const MultiMetricDetectors: FC<Props> = ({ isActive, setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
    resultsLoader,
  } = useContext(JobCreatorContext);

  if (isMultiMetricJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as MultiMetricJobCreator;

  const { fields, aggs } = newJobCapsService;
  const [selectedOptions, setSelectedOptions] = useState<DropDownProps>([{ label: '' }]);
  const [aggFieldPairList, setAggFieldPairList] = useState<AggFieldPair[]>([]);
  const [lineChartsData, setLineChartsData] = useState<LineChartData>({});
  const [modelData, setModelData] = useState<Record<number, ModelItem[]>>([]);
  const [anomalyData, setAnomalyData] = useState<Record<number, Anomaly[]>>([]);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [chartSettings, setChartSettings] = useState(defaultChartSettings);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    setSelectedOptions(selectedOptionsIn);
  }

  function addDetector() {
    if (selectedOptions !== null && selectedOptions.length) {
      const option = selectedOptions[0] as DropDownLabel;
      if (typeof option !== 'undefined') {
        const newPair = { agg: option.agg, field: option.field };
        setAggFieldPairList([...aggFieldPairList, newPair]);
        setSelectedOptions([{ label: '' }]);
        setIsValid(true);
      } else {
        setAggFieldPairList([]);
        setIsValid(false);
      }
    }
  }

  function setResultsWrapper(results: Results) {
    setModelData(results.model);
    setAnomalyData(results.anomalies);
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
      jobCreator.removeAllDetectors();
      aggFieldPairList.forEach(pair => {
        jobCreator.addDetector(pair.agg, pair.field);
      });
      jobCreatorUpdate();
      loadCharts();
      // setAggFieldPair(null);
      // setIsValid(aggFieldPair !== null);
    },
    [aggFieldPairList.length]
  );

  useEffect(
    () => {
      if (jobCreator.start !== start || jobCreator.end !== end) {
        setStart(jobCreator.start);
        setEnd(jobCreator.end);
        loadCharts();
      }
    },
    [jobCreatorUpdated]
  );

  function getChartSettings(): ChartSettings {
    const cs = {
      ...defaultChartSettings,
      intervalMs: chartInterval.getInterval().asMilliseconds(),
    };
    if (aggFieldPairList.length > 2) {
      cs.cols = 3;
      cs.height = '150px';
      cs.intervalMs = cs.intervalMs * 3;
    } else if (aggFieldPairList.length > 1) {
      cs.cols = 2;
      cs.height = '200px';
      cs.intervalMs = cs.intervalMs * 2;
    }
    return cs;
  }

  async function loadCharts() {
    const cs = getChartSettings();
    setChartSettings(cs);

    if (aggFieldPairList.length > 0) {
      const resp: LineChartData = await chartLoader.loadLineCharts(
        jobCreator.start,
        jobCreator.end,
        aggFieldPairList,
        jobCreator.splitField,
        cs.intervalMs
      );

      setLineChartsData(resp);
    }
  }

  return (
    <Fragment>
      {isActive && (
        <Fragment>
          {lineChartsData && (
            <EuiFlexGrid columns={chartSettings.cols as any}>
              {aggFieldPairList.map((af, i) => (
                <EuiFlexItem key={i}>
                  {lineChartsData[i] !== undefined && (
                    <AnomalyChart
                      lineChartData={lineChartsData[i]}
                      modelData={modelData[i]}
                      anomalyData={anomalyData[i]}
                      progress={progress}
                      height={chartSettings.height}
                      width={chartSettings.width}
                    />
                  )}
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          )}
          <MetricSelector
            aggs={aggs}
            fields={fields}
            detectorChangeHandler={detectorChangeHandler}
            selectedOptions={selectedOptions}
            addDetector={addDetector}
            maxWidth={560}
          />
        </Fragment>
      )}
      {isActive === false && (
        <Fragment>
          {lineChartsData && (
            <EuiFlexGrid columns={chartSettings.cols as any}>
              {aggFieldPairList.map((af, i) => (
                <EuiFlexItem key={i}>
                  {lineChartsData[i] !== undefined && (
                    <AnomalyChart
                      lineChartData={lineChartsData[i]}
                      modelData={modelData[i]}
                      anomalyData={anomalyData[i]}
                      progress={progress}
                      height={chartSettings.height}
                      width={chartSettings.width}
                    />
                  )}
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
