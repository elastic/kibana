/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { JobCreatorContext } from '../../../job_creator_context';
import { PopulationJobCreator } from '../../../../../common/job_creator';
import { Results, ModelItem, Anomaly } from '../../../../../common/results_loader';
import { LineChartData } from '../../../../../common/chart_loader';
import { Field, AggFieldPair } from '../../../../../../../../../common/types/fields';
import { getChartSettings, defaultChartSettings } from '../../../charts/common/settings';
import { ChartGrid } from './chart_grid';
import { mlMessageBarService } from '../../../../../../../components/messagebar';

type DetectorFieldValues = Record<number, string[]>;

export const PopulationDetectorsSummary: FC = () => {
  const { jobCreator: jc, chartLoader, resultsLoader, chartInterval } = useContext(
    JobCreatorContext
  );
  const jobCreator = jc as PopulationJobCreator;

  const [aggFieldPairList, setAggFieldPairList] = useState<AggFieldPair[]>(
    jobCreator.aggFieldPairs
  );
  const [lineChartsData, setLineChartsData] = useState<LineChartData>({});
  const [loadingData, setLoadingData] = useState(false);
  const [modelData, setModelData] = useState<Record<number, ModelItem[]>>([]);
  const [anomalyData, setAnomalyData] = useState<Record<number, Anomaly[]>>([]);
  const [chartSettings, setChartSettings] = useState(defaultChartSettings);
  const [fieldValuesPerDetector, setFieldValuesPerDetector] = useState<DetectorFieldValues>({});

  function setResultsWrapper(results: Results) {
    setModelData(results.model);
    setAnomalyData(results.anomalies);
  }

  useEffect(() => {
    // subscribe to progress and results
    const subscription = resultsLoader.subscribeToResults(setResultsWrapper);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // watch for changes in by field values
  // redraw the charts if they change.
  // triggered when example fields have been loaded
  // if the split field or by fields have changed
  useEffect(() => {
    if (allDataReady()) {
      loadCharts();
    }
  }, [JSON.stringify(fieldValuesPerDetector), jobCreator.splitField]);

  // watch for changes in split field or by fields.
  // load example field values
  // changes to fieldValues here will trigger the card effect via setFieldValuesPerDetector
  useEffect(() => {
    loadFieldExamples();
  }, [jobCreator.splitField]);

  async function loadCharts() {
    if (allDataReady()) {
      setLoadingData(true);
      try {
        const cs = getChartSettings(jobCreator, chartInterval);
        setChartSettings(cs);
        const resp: LineChartData = await chartLoader.loadPopulationCharts(
          jobCreator.start,
          jobCreator.end,
          aggFieldPairList,
          jobCreator.splitField,
          cs.intervalMs
        );

        setLineChartsData(resp);
      } catch (error) {
        mlMessageBarService.notify.error(error);
        setLineChartsData({});
      }
      setLoadingData(false);
    }
  }

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

  function allDataReady() {
    let ready = aggFieldPairList.length > 0;
    aggFieldPairList.forEach((af) => {
      if (af.by !== undefined && af.by.field !== null) {
        // if a by field is set, it's only ready when the value is loaded
        ready = ready && af.by.value !== null;
      }
    });
    return ready;
  }

  return (
    <Fragment>
      {jobCreator.splitField !== null && (
        <Fragment>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.populationView.splitFieldTitle"
            defaultMessage="Population split by {field}"
            values={{ field: jobCreator.splitField.name }}
          />
          <EuiSpacer />
          <ChartGrid
            aggFieldPairList={jobCreator.aggFieldPairs}
            chartSettings={chartSettings}
            splitField={jobCreator.splitField}
            lineChartsData={lineChartsData}
            modelData={modelData}
            anomalyData={anomalyData}
            jobType={jobCreator.type}
            fieldValuesPerDetector={fieldValuesPerDetector}
            loading={loadingData}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
