/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { formatBytes } from '@kbn/formatters';
import { useSummaryPanelContext } from '../../../hooks';
import {
  summaryPanelEstimatedDataText,
  summaryPanelEstimatedDataTooltipText,
} from '../../../../common/translations';
import { LastDayDataPlaceholder } from './last_day_data_placeholder';

export function EstimatedData() {
  const { estimatedData, isEstimatedDataLoading } = useSummaryPanelContext();

  return (
    <LastDayDataPlaceholder
      title={summaryPanelEstimatedDataText}
      tooltip={summaryPanelEstimatedDataTooltipText}
      value={formatBytes(estimatedData.estimatedDataInBytes)}
      isLoading={isEstimatedDataLoading}
    />
  );
}
