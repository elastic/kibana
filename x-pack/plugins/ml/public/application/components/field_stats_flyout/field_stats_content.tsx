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
import { getDefaultDatafeedQuery } from '../../jobs/new_job/utils/new_job_utils';
import { useMlKibana } from '../../contexts/kibana';
import { JobCreatorContext } from '../../jobs/new_job/pages/components/job_creator_context';
import { useFieldStatsFlyoutContext } from './use_field_stats_flytout_context';

const defaultDatafeedQuery = getDefaultDatafeedQuery();

export const FieldStatsContent: FC = () => {
  const {
    services: { uiSettings, data, fieldFormats, charts },
  } = useMlKibana();
  const fieldStatsServices: FieldStatsServices = {
    uiSettings,
    dataViews: data.dataViews,
    data,
    fieldFormats,
    charts,
  };
  const { jobCreator, jobCreatorUpdated } = useContext(JobCreatorContext);
  const { fieldName } = useFieldStatsFlyoutContext();

  const [start, setStart] = useState(jobCreator.start);
  const [end, setEnd] = useState(jobCreator.end);

  useEffect(() => {
    if (jobCreator.start !== start || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  // Format timestamp to ISO formatted date strings
  const timeRange = useMemo(
    () =>
      start && end
        ? { from: moment(start).toISOString(), to: moment(end).toISOString() }
        : undefined,
    [start, end]
  );

  const fieldForStats = useMemo(
    () => (isDefined(fieldName) ? jobCreator.dataView.getFieldByName(fieldName) : undefined),
    [fieldName, jobCreator.dataView]
  );

  const showFieldStats = timeRange && isDefined(jobCreator.dataViewId) && fieldForStats;

  return showFieldStats ? (
    <FieldStats
      key={fieldForStats.name}
      services={fieldStatsServices}
      dslQuery={jobCreator.query ?? defaultDatafeedQuery}
      fromDate={timeRange.from}
      toDate={timeRange.to}
      dataViewOrDataViewId={jobCreator.dataView}
      field={fieldForStats}
      data-test-subj={`jobCreatorFieldStatsPopover ${fieldForStats.name}`}
    />
  ) : null;
};
