/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import {
  // EuiFieldSearch,
  // EuiFlexGroup,
  // EuiFlexItem,
  // EuiForm,
  // EuiFormHelpText,
  // EuiFormRow,
  // EuiSpacer,
  // EuiFieldNumber,
  // EuiSelect,
  // EuiComboBox,
  // EuiComboBoxOptionProps,
  EuiFieldText,
} from '@elastic/eui';

import { WizardNav } from '../../../../../data_frame/components/wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { isSingleMetricJobCreator } from '../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../common/results_loader';
import { AggSelect } from './agg_select';
// import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { DropDownLabel } from './agg_select';
// import { Detector } from '../../../common/job_creator/configs/job';
import { Field, Aggregation /* , FieldId, AggId*/ } from '../../../../../../common/types/fields';
import { AnomalyChart } from '../charts/anomaly_chart';

interface AggFieldPair {
  agg: Aggregation;
  field: Field;
}

export const PickFieldsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
    resultsLoader,
  } = useContext(JobCreatorContext);
  const { fields, aggs } = newJobCapsService;
  const [selectedOptions, setSelectedOptions] = useState([{ label: '' }]);
  const [fieldAggPair, setFieldAggPair] = useState<AggFieldPair | null>(null);
  const [bucketSpan, setBucketSpan] = useState(jobCreator.bucketSpan);
  const [lineChartData, setLineChartData] = useState([]);
  const [modelData, setModelData] = useState<ModelItem[]>([]);
  const [anomalyData, setAnomalyData] = useState<Anomaly[]>([]);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [progress, setProgress] = useState(resultsLoader.progress);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    setSelectedOptions(selectedOptionsIn);
    if (isSingleMetricJobCreator(jobCreator)) {
      if (selectedOptionsIn.length) {
        const option = selectedOptionsIn[0];
        if (typeof option !== 'undefined') {
          setFieldAggPair({ agg: option.agg, field: option.field });
        } else {
          setFieldAggPair(null);
        }
      }
    }
  }

  function setResultsWrapper(results: Results) {
    setModelData(results.model);
    // console.log(results.anomalies);
    setAnomalyData(results.anomalies);
    // console.log('results progress', results.model);
    // setProgress(p);
  }

  // subscribe to progress
  useEffect(() => {
    jobCreator.subscribeToProgress(setProgress);
  }, []);

  // subscribe to results
  useEffect(() => {
    // console.log('subscribing to progress');
    resultsLoader.subscribeToResults(setResultsWrapper);
  }, []);

  useEffect(
    () => {
      if (fieldAggPair !== null) {
        if (isSingleMetricJobCreator(jobCreator)) {
          jobCreator.setDetector(fieldAggPair.agg, fieldAggPair.field);
          jobCreatorUpdate();
          loadChart();
        }
      }
    },
    [fieldAggPair]
  );

  useEffect(
    () => {
      jobCreator.bucketSpan = bucketSpan;
      jobCreatorUpdate();
    },
    [bucketSpan]
  );

  useEffect(
    () => {
      setBucketSpan(jobCreator.bucketSpan);

      if (jobCreator.start !== start || jobCreator.end !== end) {
        setStart(jobCreator.start);
        setEnd(jobCreator.end);
        loadChart();
      }
    },
    [jobCreatorUpdated]
  );

  function nextActive(): boolean {
    return fieldAggPair !== null && bucketSpan !== '';
  }

  async function loadChart() {
    if (fieldAggPair !== null) {
      const resp = await chartLoader.loadLineChart(
        jobCreator.start,
        jobCreator.end,
        fieldAggPair.agg,
        fieldAggPair.field,
        chartInterval.getInterval().asMilliseconds(),
        null
      );

      // let max: number = Number.MIN_VALUE;
      // let min: number = Number.MAX_VALUE;
      // resp.forEach((r: any) => {
      //   max = Math.max(r.value, max);
      //   min = Math.min(r.value, min);
      // });

      // const data = {
      //   data: resp,
      //   min,
      //   max,
      // };
      // const data = resp.map((r: any) => ({ x: r.time, y: r.value }));
      // const data = resp.results.map((r: any) => [r.time, r.value]);

      setLineChartData(resp);
      // console.log(data);
      // console.log(resp);
    }
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <AggSelect
            aggs={aggs}
            fields={fields}
            changeHandler={detectorChangeHandler}
            selectedOptions={selectedOptions}
          />
          {lineChartData.length > 0 && (
            <AnomalyChart
              lineChartData={lineChartData}
              modelData={modelData}
              anomalyData={anomalyData}
              progress={progress}
              height="400px"
              width="100%"
            />
          )}
          <EuiFieldText
            placeholder="Bucket span"
            value={bucketSpan}
            onChange={e => setBucketSpan(e.target.value)}
          />
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.TIME_RANGE)}
            next={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            nextActive={nextActive()}
          />
        </Fragment>
      )}
      {isCurrentStep === false && (
        <Fragment>
          {lineChartData.length > 0 && (
            <AnomalyChart
              lineChartData={lineChartData}
              modelData={modelData}
              anomalyData={anomalyData}
              progress={progress}
              height="400px"
              width="100%"
            />
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
