/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import moment from 'moment';
import { WizardNav } from '../wizard_nav';
import { StepProps, WIZARD_STEPS } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { useMlContext } from '../../../../../contexts/ml';
import { FullTimeRangeSelector } from '../../../../../components/full_time_range_selector';
import { EventRateChart } from '../charts/event_rate_chart';
import { LineChartPoint } from '../../../common/chart_loader';
import { JOB_TYPE } from '../../../../../../../common/constants/new_job';
import { GetTimeFieldRangeResponse } from '../../../../../services/ml_api_service';
import { TimeRangePicker, TimeRange } from '../../../common/components';
import { useMlKibana } from '../../../../../contexts/kibana';

export const TimeRangeStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { services } = useMlKibana();
  const mlContext = useMlContext();

  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated, chartLoader, chartInterval } =
    useContext(JobCreatorContext);

  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: jobCreator.start,
    end: jobCreator.end,
  });
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  async function loadChart() {
    setLoadingData(true);
    try {
      const resp = await chartLoader.loadEventRateChart(
        jobCreator.start,
        jobCreator.end,
        chartInterval.getInterval().asMilliseconds(),
        jobCreator.runtimeMappings ?? undefined,
        jobCreator.datafeedConfig.indices_options
      );
      setEventRateChartData(resp);
    } catch (error) {
      setEventRateChartData([]);
    }
    setLoadingData(false);
  }

  useEffect(() => {
    const { start, end } = timeRange;
    jobCreator.setTimeRange(start, end);
    chartInterval.setBounds({
      min: moment(start),
      max: moment(end),
    });
    // update the timefilter, to keep the URL in sync
    const { timefilter } = services.data.query.timefilter;
    timefilter.setTime({
      from: moment(start).toISOString(),
      to: moment(end).toISOString(),
    });

    jobCreatorUpdate();
    loadChart();
  }, [JSON.stringify(timeRange)]);

  useEffect(() => {
    setTimeRange({
      start: jobCreator.start,
      end: jobCreator.end,
    });
  }, [jobCreatorUpdated]);

  function fullTimeRangeCallback(range: GetTimeFieldRangeResponse) {
    if (range.start.epoch !== null && range.end.epoch !== null) {
      setTimeRange({
        start: range.start.epoch,
        end: range.end.epoch,
      });
    } else {
      const { toasts } = services.notifications;
      toasts.addDanger(
        i18n.translate('xpack.ml.newJob.wizard.timeRangeStep.fullTimeRangeError', {
          defaultMessage: 'An error occurred obtaining the time range for the index',
        })
      );
    }
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <TimeRangePicker setTimeRange={setTimeRange} timeRange={timeRange} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FullTimeRangeSelector
                dataView={mlContext.currentDataView}
                query={mlContext.combinedQuery}
                disabled={false}
                callback={fullTimeRangeCallback}
              />
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
          <EuiSpacer />
          <EventRateChart
            eventRateChartData={eventRateChartData}
            height="300px"
            width="100%"
            showAxis={true}
            loading={loadingData}
          />

          <WizardNav
            next={() =>
              setCurrentStep(
                jobCreator.type === JOB_TYPE.ADVANCED
                  ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
                  : WIZARD_STEPS.PICK_FIELDS
              )
            }
            nextActive={true}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
