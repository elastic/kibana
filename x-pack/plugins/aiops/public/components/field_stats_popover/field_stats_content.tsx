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
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import moment from 'moment';
import { euiPaletteColorBlind } from '@elastic/eui';

const DEFAULT_COLOR = euiPaletteColorBlind()[0];

interface FieldStatsContentProps {
  dataView: DataView;
  field: DataViewField;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
  dslQuery?: FieldStatsProps['dslQuery'];
}

export const FieldStatsContent: FC<FieldStatsContentProps> = ({
  dataView: currentDataView,
  field,
  fieldStatsServices,
  timeRangeMs,
  dslQuery,
}) => {
  // Format timestamp to ISO formatted date strings
  const timeRange = useMemo(() => {
    // Use the provided timeRange if available
    if (timeRangeMs) {
      return {
        from: moment(timeRangeMs.from).toISOString(),
        to: moment(timeRangeMs.to).toISOString(),
      };
    }

    const now = moment();
    return { from: now.toISOString(), to: now.toISOString() };
  }, [timeRangeMs]);

  const showFieldStats = timeRange && isDefined(currentDataView) && field;

  return showFieldStats ? (
    <FieldStats
      key={field.name}
      services={fieldStatsServices}
      dslQuery={dslQuery ?? { match_all: {} }}
      fromDate={timeRange.from}
      toDate={timeRange.to}
      dataViewOrDataViewId={currentDataView}
      field={field}
      data-test-subj={`mlAiOpsFieldStatsPopoverContent ${field.name}`}
      color={DEFAULT_COLOR}
    />
  ) : null;
};
