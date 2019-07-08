/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState, useReducer } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { PopulationJobCreator, isPopulationJobCreator } from '../../../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import { LineChartData } from '../../../../../common/chart_loader';
import { DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { Field, AggFieldPair, SplitField } from '../../../../../../../../common/types/fields';
import { AnomalyChart, CHART_TYPE } from '../../../charts/anomaly_chart';
import { defaultChartSettings, ChartSettings } from '../../../charts/common/settings';
import { MetricSelector } from './metric_selector';
import { DetectorTitle } from '../detector_title';
import { JobProgress } from '../job_progress';
import { SplitCards } from '../split_cards';
import { SplitFieldSelector, ByFieldSelector } from '../split_field';
import { JOB_TYPE } from '../../../../../common/job_creator/util/constants';
import { MlTimeBuckets } from '../../../../../../../util/ml_time_buckets';

interface Props {
  isActive: boolean;
  setIsValid: (na: boolean) => void;
}

type DetectorFieldValues = Record<number, string[]>;

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
  const [lineChartsData, setLineChartsData] = useState<LineChartData>({});
  const [modelData, setModelData] = useState<Record<number, ModelItem[]>>([]);
  const [anomalyData, setAnomalyData] = useState<Record<number, Anomaly[]>>([]);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [chartSettings, setChartSettings] = useState(defaultChartSettings);
  const [splitField, setSplitField] = useState(jobCreator.splitField);
  const [fieldValuesPerDetector, setFieldValuesPerDetector] = useState<DetectorFieldValues>({});
  const [byFieldsUpdated, setByFieldsUpdated] = useReducer<(s: number) => number>(s => s + 1, 0);

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
      } else {
        setAggFieldPairList([]);
      }
    }
  }

  function deleteDetector(index: number) {
    aggFieldPairList.splice(index, 1);
    setAggFieldPairList([...aggFieldPairList]);
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

  // watch for changes in detector list length
  useEffect(
    () => {
      jobCreator.removeAllDetectors();
      aggFieldPairList.forEach((pair, i) => {
        jobCreator.addDetector(pair.agg, pair.field);
        if (pair.by !== undefined) {
          // re-add by fields
          jobCreator.setByField(pair.by.field, i);
        }
      });
      jobCreatorUpdate();
      loadCharts();
      setIsValid(aggFieldPairList.length > 0);
    },
    [aggFieldPairList.length]
  );

  // watch for changes in by field values
  // redraw the charts if they change.
  // triggered when example fields have been loaded
  // if the split field or by fields have changed
  useEffect(
    () => {
      loadCharts();
    },
    [JSON.stringify(fieldValuesPerDetector)]
  );

  // watch for change in jobCreator
  useEffect(
    () => {
      if (jobCreator.start !== start || jobCreator.end !== end) {
        setStart(jobCreator.start);
        setEnd(jobCreator.end);
        loadCharts();
      }
      setSplitField(jobCreator.splitField);

      // update by fields and their by fields
      let update = false;
      const newList = [...aggFieldPairList];
      newList.forEach((pair, i) => {
        const bf = jobCreator.getByField(i);
        if (pair.by !== undefined && pair.by.field !== bf) {
          pair.by.field = bf;
          update = true;
        }
      });
      if (update) {
        setAggFieldPairList(newList);
        setByFieldsUpdated(0);
      }
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
        cs.intervalMs
      );

      setLineChartsData(resp);
    }
  }

  // watch for changes in split field or by fields.
  // load example field values
  useEffect(
    () => {
      loadFieldExamples();
    },
    [splitField, byFieldsUpdated]
  );

  async function loadFieldExamples() {
    const promises: any[] = [];
    aggFieldPairList.forEach((af, i) => {
      if (af.by !== undefined && af.by.field !== null) {
        promises.push(
          (async (index: number, field: Field) => {
            return {
              index,
              fields: await chartLoader.loadFieldExampleValues(field),
            };
          })(i, af.by.field)
        );
      }
    });
    const results = await Promise.all(promises);
    const fieldValues = results.reduce((p, c) => {
      p[c.index] = c.fields;
      return p;
    }, {}) as DetectorFieldValues;

    const newPairs = aggFieldPairList.map((pair, i) => ({
      ...pair,
      ...(pair.by === undefined || pair.by.field === null
        ? {}
        : {
            by: {
              ...pair.by,
              value: fieldValues[i][0],
            },
          }),
    }));
    setAggFieldPairList([...newPairs]);
    setFieldValuesPerDetector(fieldValues);
  }

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
                  lineChartsData={lineChartsData}
                  modelData={modelData}
                  anomalyData={anomalyData}
                  deleteDetector={deleteDetector}
                  jobType={jobCreator.type}
                  fieldValuesPerDetector={fieldValuesPerDetector}
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
                lineChartsData={lineChartsData}
                modelData={modelData}
                anomalyData={anomalyData}
                jobType={jobCreator.type}
                fieldValuesPerDetector={fieldValuesPerDetector}
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
  lineChartsData: LineChartData;
  modelData: Record<number, ModelItem[]>;
  anomalyData: Record<number, Anomaly[]>;
  deleteDetector?: (index: number) => void;
  jobType: JOB_TYPE;
  fieldValuesPerDetector: DetectorFieldValues;
}

const ChartGrid: FC<ChartGridProps> = ({
  aggFieldPairList,
  chartSettings,
  splitField,
  lineChartsData,
  modelData,
  anomalyData,
  deleteDetector,
  jobType,
  fieldValuesPerDetector,
}) => {
  return (
    <EuiFlexGrid columns={chartSettings.cols as any}>
      {aggFieldPairList.map((af, i) => (
        <EuiFlexItem key={i}>
          {lineChartsData[i] !== undefined && (
            <Fragment>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <DetectorTitle
                    index={i}
                    agg={aggFieldPairList[i].agg}
                    field={aggFieldPairList[i].field}
                    splitField={splitField}
                    deleteDetector={deleteDetector}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <ByFieldSelector detectorIndex={i} />
                </EuiFlexItem>
              </EuiFlexGroup>
              <SplitCards
                fieldValues={fieldValuesPerDetector[i] || []}
                splitField={splitField}
                numberOfDetectors={aggFieldPairList.length}
                jobType={jobType}
              >
                <AnomalyChart
                  chartType={CHART_TYPE.SCATTER}
                  chartData={lineChartsData[i]}
                  modelData={modelData[i]}
                  anomalyData={anomalyData[i]}
                  height={chartSettings.height}
                  width={chartSettings.width}
                />
              </SplitCards>
            </Fragment>
          )}
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
};
