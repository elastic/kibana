/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useContext, useEffect, useState, useMemo } from 'react';
import { JobCreatorContext } from '../../../job_creator_context';
import { SingleMetricJobCreator } from '../../../../../common/job_creator';
import { LineChartData } from '../../../../../common/chart_loader';
import { AggSelect, DropDownLabel, DropDownProps, createLabel } from '../agg_select';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { AggFieldPair } from '../../../../../../../../../common/types/fields';
import { sortFields } from '../../../../../../../../../common/util/fields_utils';
import { AnomalyChart, CHART_TYPE } from '../../../charts/anomaly_chart';
import { getChartSettings } from '../../../charts/common/settings';
import { getToastNotificationService } from '../../../../../../../services/toast_notification_service';

interface Props {
  setIsValid: (na: boolean) => void;
}

const DTR_IDX = 0;

export const SingleMetricDetectors: FC<Props> = ({ setIsValid }) => {
  const {
    jobCreator: jc,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
  } = useContext(JobCreatorContext);
  const jobCreator = jc as SingleMetricJobCreator;

  const fields = useMemo(
    () => sortFields([...newJobCapsService.fields, ...jobCreator.runtimeFields]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [selectedOptions, setSelectedOptions] = useState<DropDownProps>(
    jobCreator.aggFieldPair !== null ? [{ label: createLabel(jobCreator.aggFieldPair) }] : []
  );
  const [aggFieldPair, setAggFieldPair] = useState<AggFieldPair | null>(jobCreator.aggFieldPair);
  const [lineChartsData, setLineChartData] = useState<LineChartData>({});
  const [loadingData, setLoadingData] = useState(false);
  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [bucketSpanMs, setBucketSpanMs] = useState(jobCreator.bucketSpanMs);

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

  useEffect(() => {
    if (aggFieldPair !== null) {
      jobCreator.setDetector(aggFieldPair.agg, aggFieldPair.field);
      jobCreatorUpdate();
      loadChart();
      setIsValid(aggFieldPair !== null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreator, aggFieldPair]);

  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
      loadChart();
    }

    if (jobCreator.bucketSpanMs !== bucketSpanMs) {
      setBucketSpanMs(jobCreator.bucketSpanMs);
      loadChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreator, jobCreatorUpdated]);

  async function loadChart() {
    if (aggFieldPair !== null) {
      setLoadingData(true);
      try {
        const cs = getChartSettings(jobCreator, chartInterval);
        const resp: LineChartData = await chartLoader.loadLineCharts(
          jobCreator.start,
          jobCreator.end,
          [aggFieldPair],
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
      <AggSelect
        fields={fields}
        changeHandler={detectorChangeHandler}
        selectedOptions={selectedOptions}
        removeOptions={[]}
      />
      {(lineChartsData[DTR_IDX] !== undefined || loadingData === true) && (
        <Fragment>
          <AnomalyChart
            chartType={CHART_TYPE.LINE}
            chartData={lineChartsData[DTR_IDX]}
            modelData={[]}
            anomalyData={[]}
            height="300px"
            width="100%"
            loading={loadingData}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
