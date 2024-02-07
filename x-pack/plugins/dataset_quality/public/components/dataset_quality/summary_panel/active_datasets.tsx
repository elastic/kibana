/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSummaryPanelContext } from '../../../hooks';

import {
  summaryPanelActiveDatasetsText,
  summaryPanelActiveDatasetsTooltipText,
  tableSummaryOfText,
} from '../../../../common/translations';
import { LastDayDataPlaceholder } from './last_day_data_placeholder';

export function ActiveDatasets() {
  const { datasetsActivity, isDatasetsActivityLoading } = useSummaryPanelContext();
  const text = `${datasetsActivity.active} ${tableSummaryOfText} ${datasetsActivity.total}`;

  return (
    <LastDayDataPlaceholder
      title={summaryPanelActiveDatasetsText}
      tooltip={summaryPanelActiveDatasetsTooltipText}
      value={text}
      isLoading={isDatasetsActivityLoading}
    />
  );
}
