/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
// import { timefilter } from 'ui/timefilter';
import { JobCreatorContext } from '../../../job_creator_context';
import { PopulationJobCreator, isPopulationJobCreator } from '../../../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import { LineChartData } from '../../../../../common/chart_loader';
import { DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { AggFieldPair, SplitField } from '../../../../../../../../common/types/fields';
import { AnomalyChart, CHART_TYPE } from '../../../charts/anomaly_chart';
import { defaultChartSettings, ChartSettings } from '../../../charts/common/settings';
import { MetricSelector } from './metric_selector';
import { DetectorTitle } from '../detector_title';
import { JobProgress } from '../job_progress';
// import { SplitCards } from '../split_cards';
import { SplitFieldSelector } from '../split_field';
import { JOB_TYPE } from '../../../../../common/job_creator/util/constants';
import { MlTimeBuckets } from '../../../../../../../util/ml_time_buckets';

interface Props {
  isActive: boolean;
  setIsValid: (na: boolean) => void;
}

export const PopulationDetectors: FC<Props> = ({ isActive, setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
    resultsLoader,
  } = useContext(JobCreatorContext);

  if (isPopulationJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as PopulationJobCreator;

  const { fields } = newJobCapsService;
  const [selectedOptions, setSelectedOptions] = useState<DropDownProps>([{ label: '' }]);
  const [aggFieldPairList, setAggFieldPairList] = useState<AggFieldPair[]>([]);
  // const [byFieldList, setByFieldList] = useState<SplitField[]>([]);
  const [lineChartsData, setLineChartsData] = useState<LineChartData>({});
  const [modelData, setModelData] = useState<Record<number, ModelItem[]>>([]);
  const [anomalyData, setAnomalyData] = useState<Record<number, Anomaly[]>>([]);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [chartSettings, setChartSettings] = useState(defaultChartSettings);
  const [splitField, setSplitField] = useState(jobCreator.splitField);
  const [fieldValues, setFieldValues] = useState<string[]>([]);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    addDetector(selectedOptionsIn);
  }

  function addDetector(selectedOptionsIn: DropDownLabel[]) {
    if (selectedOptionsIn !== null && selectedOptionsIn.length) {
      const option = selectedOptionsIn[0] as DropDownLabel;
      if (typeof option !== 'undefined') {
        const newPair = { agg: option.agg, field: option.field, by: { field: null, value: null } };
        setAggFieldPairList([...aggFieldPairList, newPair]);
        setSelectedOptions([{ label: '' }]);
        // setByFieldList([...byFieldList, null]);
      } else {
        setAggFieldPairList([]);
        // setByFieldList([]);
      }
    }
  }

  function deleteDetector(index: number) {
    aggFieldPairList.splice(index, 1);
    // byFieldList.splice(index, 1);
    setAggFieldPairList([...aggFieldPairList]);
    // setByFieldList([...byFieldList]);
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
      setIsValid(aggFieldPairList.length > 0);
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
      setSplitField(jobCreator.splitField);
    },
    [jobCreatorUpdated]
  );

  function getChartSettings(): ChartSettings {
    const interval = new MlTimeBuckets();
    interval.setInterval('auto');
    interval.setBounds(chartInterval.getBounds());

    const cs = {
      ...defaultChartSettings,
      intervalMs: interval.getInterval().asMilliseconds(),
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
      const resp: LineChartData = await chartLoader.loadPopulationCharts(
        jobCreator.start,
        jobCreator.end,
        aggFieldPairList,
        jobCreator.splitField,
        // fieldValues.length > 0 ? fieldValues[0] : null,
        cs.intervalMs
      );

      setLineChartsData(resp);
    }
  }

  useEffect(
    () => {
      if (splitField !== null) {
        chartLoader
          .loadFieldExampleValues(splitField)
          .then(setFieldValues)
          .catch(() => {});
      } else {
        setFieldValues([]);
      }
    },
    [splitField]
  );

  useEffect(
    () => {
      loadCharts();
    },
    [fieldValues]
  );

  return (
    <Fragment>
      {isActive === true && (
        <Fragment>
          <SplitFieldSelector />
          {splitField !== null && (
            <Fragment>
              <EuiHorizontalRule margin="l" />

              {lineChartsData && (
                <ChartGrid
                  aggFieldPairList={aggFieldPairList}
                  chartSettings={chartSettings}
                  splitField={splitField}
                  fieldValues={fieldValues}
                  lineChartsData={lineChartsData}
                  modelData={modelData}
                  anomalyData={anomalyData}
                  deleteDetector={deleteDetector}
                  jobType={jobCreator.type}
                />
              )}
              <MetricSelector
                fields={fields}
                detectorChangeHandler={detectorChangeHandler}
                selectedOptions={selectedOptions}
                maxWidth={560}
                removeOptions={aggFieldPairList}
              />
            </Fragment>
          )}
        </Fragment>
      )}
      {isActive === false && (
        <Fragment>
          {lineChartsData && (
            <Fragment>
              <ChartGrid
                aggFieldPairList={aggFieldPairList}
                chartSettings={chartSettings}
                splitField={splitField}
                fieldValues={fieldValues}
                lineChartsData={lineChartsData}
                modelData={modelData}
                anomalyData={anomalyData}
                jobType={jobCreator.type}
              />
              <JobProgress progress={progress} />
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};

interface ChartGridProps {
  aggFieldPairList: AggFieldPair[];
  chartSettings: ChartSettings;
  splitField: SplitField;
  fieldValues: string[];
  lineChartsData: LineChartData;
  modelData: Record<number, ModelItem[]>;
  anomalyData: Record<number, Anomaly[]>;
  deleteDetector?: (index: number) => void;
  jobType: JOB_TYPE;
}

const ChartGrid: FC<ChartGridProps> = ({
  aggFieldPairList,
  chartSettings,
  splitField,
  fieldValues,
  lineChartsData,
  modelData,
  anomalyData,
  deleteDetector,
  jobType,
}) => {
  return (
    // <SplitCards
    //   fieldValues={fieldValues}
    //   splitField={splitField}
    //   numberOfDetectors={aggFieldPairList.length}
    //   jobType={jobType}
    // >
    <EuiFlexGrid columns={chartSettings.cols as any}>
      {aggFieldPairList.map((af, i) => (
        <EuiFlexItem key={i}>
          {lineChartsData[i] !== undefined && (
            <Fragment>
              <DetectorTitle
                index={i}
                agg={aggFieldPairList[i].agg}
                field={aggFieldPairList[i].field}
                splitField={splitField}
                deleteDetector={deleteDetector}
              />
              <AnomalyChart
                chartType={CHART_TYPE.SCATTER}
                chartData={lineChartsData[i]}
                modelData={modelData[i]}
                anomalyData={anomalyData[i]}
                height={chartSettings.height}
                width={chartSettings.width}
              />
            </Fragment>
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
    // </SplitCards>
  );
};
