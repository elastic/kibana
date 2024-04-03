/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import type { JobSelectorFlyoutProps } from '../../../application/components/job_selector/job_selector_flyout';
import { JobSelectorFlyoutContent } from '../../../application/components/job_selector/job_selector_flyout';

export const JobSelectorFlyout: FC<JobSelectorFlyoutProps> = ({
  selectedIds,
  withTimeRangeSelector,
  dateFormatTz,
  singleSelection,
  timeseriesOnly,
  onFlyoutClose,
  onSelectionConfirmed,
  maps,
}) => {
  const [applyTimeRangeState, setApplyTimeRangeState] = useState<boolean>(true);

  return (
    <JobSelectorFlyoutContent
      selectedIds={selectedIds}
      withTimeRangeSelector={withTimeRangeSelector}
      dateFormatTz={dateFormatTz}
      singleSelection={singleSelection}
      timeseriesOnly={timeseriesOnly}
      onFlyoutClose={onFlyoutClose}
      onSelectionConfirmed={onSelectionConfirmed}
      onTimeRangeConfigChange={setApplyTimeRangeState}
      applyTimeRangeConfig={applyTimeRangeState}
      maps={maps}
    />
  );
};
