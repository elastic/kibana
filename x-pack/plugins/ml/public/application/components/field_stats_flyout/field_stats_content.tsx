/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useMemo, useState } from 'react';
import { FieldStats, FieldStatsServices } from '@kbn/unified-field-list-plugin/public';
import moment from 'moment';
import { isDefined } from '@kbn/ml-is-defined';
import type { DataView } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { getDefaultDatafeedQuery } from '../../jobs/new_job/utils/new_job_utils';
import { JobCreatorContext } from '../../jobs/new_job/pages/components/job_creator_context';
import { useFieldStatsFlyoutContext } from './use_field_stats_flytout_context';

const defaultDatafeedQuery = getDefaultDatafeedQuery();

export const FieldStatsContent: FC<{
  dataView: DataView;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
}> = ({ dataView: currentDataView, fieldStatsServices, timeRangeMs }) => {
  const { jobCreator, jobCreatorUpdated } = useContext(JobCreatorContext);
  const { fieldName } = useFieldStatsFlyoutContext();

  const [start, setStart] = useState(jobCreator?.start);
  const [end, setEnd] = useState(jobCreator?.end);

  useEffect(() => {
    if ((jobCreator && jobCreator.start !== start) || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  // Format timestamp to ISO formatted date strings
  const timeRange = useMemo(() => {
    // Use the provided timeRange if available
    if (timeRangeMs) {
      return {
        from: moment(timeRangeMs.from).toISOString(),
        to: moment(timeRangeMs.to).toISOString(),
      };
    }

    // If time range is available via jobCreator, use that
    // else mimic Discover and set timeRange to be now for data view without time field
    const now = moment();
    return start && end
      ? { from: moment(start).toISOString(), to: moment(end).toISOString() }
      : { from: now.toISOString(), to: now.toISOString() };
  }, [timeRangeMs, start, end]);

  const fieldForStats = useMemo(
    () => (isDefined(fieldName) ? currentDataView.getFieldByName(fieldName) : undefined),
    [fieldName, currentDataView]
  );

  const showFieldStats = timeRange && isDefined(currentDataView) && fieldForStats;

  return showFieldStats ? (
    <FieldStats
      key={fieldForStats.name}
      services={fieldStatsServices}
      dslQuery={jobCreator.query ?? defaultDatafeedQuery}
      fromDate={timeRange.from}
      toDate={timeRange.to}
      dataViewOrDataViewId={currentDataView}
      field={fieldForStats}
      data-test-subj={`jobCreatorFieldStatsPopover ${fieldForStats.name}`}
    />
  ) : null;
};
