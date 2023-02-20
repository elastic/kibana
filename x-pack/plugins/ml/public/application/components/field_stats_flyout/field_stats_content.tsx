/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import {
  FieldStats,
  FieldStatsProps,
  FieldStatsServices,
} from '@kbn/unified-field-list-plugin/public';
import { isDefined } from '@kbn/ml-is-defined';
import type { DataView } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import moment from 'moment';
import { euiPaletteColorBlind } from '@elastic/eui';
import { getDefaultDatafeedQuery } from '../../jobs/new_job/utils/new_job_utils';
import { useFieldStatsFlyoutContext } from './use_field_stats_flytout_context';

const DEFAULT_DSL_QUERY = getDefaultDatafeedQuery();
const DEFAULT_COLOR = euiPaletteColorBlind()[0];

export const FieldStatsContent: FC<{
  dataView: DataView;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
  dslQuery?: FieldStatsProps['dslQuery'];
}> = ({ dataView: currentDataView, fieldStatsServices, timeRangeMs, dslQuery }) => {
  const { fieldName } = useFieldStatsFlyoutContext();

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
    return { from: now.toISOString(), to: now.toISOString() };
  }, [timeRangeMs]);

  const fieldForStats = useMemo(
    () => (isDefined(fieldName) ? currentDataView.getFieldByName(fieldName) : undefined),
    [fieldName, currentDataView]
  );

  const showFieldStats = timeRange && isDefined(currentDataView) && fieldForStats;

  return showFieldStats ? (
    <FieldStats
      key={fieldForStats.name}
      services={fieldStatsServices}
      dslQuery={dslQuery ?? DEFAULT_DSL_QUERY}
      fromDate={timeRange.from}
      toDate={timeRange.to}
      dataViewOrDataViewId={currentDataView}
      field={fieldForStats}
      data-test-subj={`mlFieldStatsFlyoutContent ${fieldForStats.name}`}
      color={DEFAULT_COLOR}
    />
  ) : null;
};
