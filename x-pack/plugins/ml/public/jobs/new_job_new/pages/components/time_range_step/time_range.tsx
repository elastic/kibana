/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { timefilter } from 'ui/timefilter';
import moment from 'moment';
// import dateMath from '@elastic/datemath';
import { WizardNav } from '../../../../../data_frame/components/wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
// import { TestInputs } from './test_inputs';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';
import {
  FullTimeRangeSelector,
  getTimeFilterRange,
} from '../../../../../components/full_time_range_selector';
import { EventRateChart } from '../charts/event_rate_chart';
import { LineChartPoint } from '../../../common/chart_loader';

export const TimeRangeStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    chartLoader,
    chartInterval,
  } = useContext(JobCreatorContext);

  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);

  async function loadChart() {
    const resp = await chartLoader.loadEventRateChart(
      jobCreator.start,
      jobCreator.end,
      chartInterval.getInterval().asMilliseconds()
    );
    setEventRateChartData(resp);
  }

  useEffect(
    () => {
      jobCreator.setTimeRange(start, end);
      chartInterval.setBounds({
        min: moment(start),
        max: moment(end),
      });
      jobCreatorUpdate();
      loadChart();
    },
    [start, end]
  );

  useEffect(
    () => {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
    },
    [jobCreatorUpdated]
  );

  const timefilterChange = () => {
    const { to, from } = getTimeFilterRange();
    if (to >= from) {
      setStart(from);
      setEnd(to);
    }
  };

  useEffect(() => {
    timefilter.on('timeUpdate', timefilterChange);
    return () => {
      timefilter.off('timeUpdate', timefilterChange);
    };
  }, []);

  return (
    <Fragment>
      <div
        style={{
          visibility: isCurrentStep ? 'inherit' : 'hidden',
          position: isCurrentStep ? 'inherit' : 'absolute',
        }}
      >
        <EventRateChart
          eventRateChartData={eventRateChartData}
          height="300px"
          width="100%"
          showAxis={true}
        />
      </div>
      <div
        style={{
          visibility: isCurrentStep ? 'hidden' : 'inherit',
          position: isCurrentStep ? 'absolute' : 'inherit',
        }}
      >
        <EventRateChart
          eventRateChartData={eventRateChartData}
          height="70px"
          width="100%"
          showAxis={false}
        />
      </div>

      {isCurrentStep && (
        <Fragment>
          {/* <TestInputs start={start} end={end} setStart={v => setStart(v)} setEnd={v => setEnd(v)} /> */}
          <FullTimeRangeSelector
            indexPattern={kibanaContext.currentIndexPattern}
            query={kibanaContext.combinedQuery}
            disabled={false}
          />
          <WizardNav next={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)} nextActive={true} />
        </Fragment>
      )}
    </Fragment>
  );
};
