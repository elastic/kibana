/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { JobCreatorContext } from '../../../job_creator_context';
import { MultiMetricJobCreator } from '../../../../../common/job_creator';
import { LineChartData } from '../../../../../common/chart_loader';
import { DropDownLabel, DropDownProps } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { AggFieldPair } from '../../../../../../../../../common/types/fields';
import { getChartSettings, defaultChartSettings } from '../../../charts/common/settings';
import { MetricSelector } from './metric_selector';
import { ChartGrid } from './chart_grid';
import { mlMessageBarService } from '../../../../../../../components/messagebar';

interface Props {
  setIsValid: (na: boolean) => void;
}

export const MultiMetricDetectors: FC<Props> = ({ setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
  } = useContext(JobCreatorContext);

  const jobCreator = jc as MultiMetricJobCreator;

  const { fields } = newJobCapsService;
  const [selectedOptions, setSelectedOptions] = useState<DropDownProps>([]);
  const [aggFieldPairList, setAggFieldPairList] = useState<AggFieldPair[]>(
    jobCreator.aggFieldPairs
  );
  const [lineChartsData, setLineChartsData] = useState<LineChartData>({});
  const [loadingData, setLoadingData] = useState(false);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [bucketSpanMs, setBucketSpanMs] = useState(jobCreator.bucketSpanMs);
  const [chartSettings, setChartSettings] = useState(defaultChartSettings);
  const [splitField, setSplitField] = useState(jobCreator.splitField);
  const [fieldValues, setFieldValues] = useState<string[]>([]);
  const [pageReady, setPageReady] = useState(false);

  function detectorChangeHandler(selectedOptionsIn: DropDownLabel[]) {
    addDetector(selectedOptionsIn);
  }

  function addDetector(selectedOptionsIn: DropDownLabel[]) {
    if (selectedOptionsIn !== null && selectedOptionsIn.length) {
      const option = selectedOptionsIn[0] as DropDownLabel;
      if (typeof option !== 'undefined') {
        const newPair = { agg: option.agg, field: option.field };
        setAggFieldPairList([...aggFieldPairList, newPair]);
        setSelectedOptions([]);
      } else {
        setAggFieldPairList([]);
      }
    }
  }

  function deleteDetector(index: number) {
    aggFieldPairList.splice(index, 1);
    setAggFieldPairList([...aggFieldPairList]);
  }

  useEffect(() => {
    setPageReady(true);
  }, []);

  // watch for changes in detector list length
  useEffect(() => {
    jobCreator.removeAllDetectors();
    aggFieldPairList.forEach((pair) => {
      jobCreator.addDetector(pair.agg, pair.field);
    });
    jobCreatorUpdate();
    loadCharts();
    setIsValid(aggFieldPairList.length > 0);
  }, [aggFieldPairList.length]);

  // watch for change in jobCreator
  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      loadCharts();
    }

    if (jobCreator.bucketSpanMs !== bucketSpanMs) {
      setBucketSpanMs(jobCreator.bucketSpanMs);
      loadCharts();
    }

    setSplitField(jobCreator.splitField);
  }, [jobCreatorUpdated]);

  // watch for changes in split field.
  // load example field values
  // changes to fieldValues here will trigger the card effect
  useEffect(() => {
    if (splitField !== null) {
      chartLoader
        .loadFieldExampleValues(splitField)
        .then(setFieldValues)
        .catch((error) => {
          mlMessageBarService.notify.error(error);
        });
    } else {
      setFieldValues([]);
    }
  }, [splitField]);

  // watch for changes in the split field values
  // reload the charts
  useEffect(() => {
    loadCharts();
  }, [fieldValues]);

  async function loadCharts() {
    if (allDataReady()) {
      setLoadingData(true);
      try {
        const cs = getChartSettings(jobCreator, chartInterval);
        setChartSettings(cs);
        const resp: LineChartData = await chartLoader.loadLineCharts(
          jobCreator.start,
          jobCreator.end,
          aggFieldPairList,
          jobCreator.splitField,
          fieldValues.length > 0 ? fieldValues[0] : null,
          cs.intervalMs
        );
        setLineChartsData(resp);
      } catch (error) {
        mlMessageBarService.notify.error(error);
        setLineChartsData([]);
      }
      setLoadingData(false);
    }
  }

  function allDataReady() {
    return (
      pageReady &&
      aggFieldPairList.length > 0 &&
      (splitField === null || (splitField !== null && fieldValues.length > 0))
    );
  }

  return (
    <Fragment>
      <ChartGrid
        aggFieldPairList={aggFieldPairList}
        chartSettings={chartSettings}
        splitField={splitField}
        fieldValues={fieldValues}
        lineChartsData={lineChartsData}
        modelData={[]}
        anomalyData={[]}
        deleteDetector={deleteDetector}
        jobType={jobCreator.type}
        loading={loadingData}
      />

      <MetricSelector
        fields={fields}
        detectorChangeHandler={detectorChangeHandler}
        selectedOptions={selectedOptions}
        removeOptions={aggFieldPairList}
      />
    </Fragment>
  );
};
