/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSummaryPanelContext } from '../../../hooks';

import {
  summaryPanelDatasetsActivityText,
  summaryPanelDatasetsActivityTooltipText,
  tableSummaryOfText,
} from '../../../../common/translations';
import { DataPlaceholder } from './data_placeholder';

export function DatasetsActivity() {
  const { datasetsActivity, isDatasetsActivityLoading, isUserAuthorizedForDataset } =
    useSummaryPanelContext();
  const text = `${datasetsActivity.active} ${tableSummaryOfText} ${datasetsActivity.total}`;

  return (
    <DataPlaceholder
      title={summaryPanelDatasetsActivityText}
      tooltip={summaryPanelDatasetsActivityTooltipText}
      value={text}
      isLoading={isDatasetsActivityLoading}
      isUserAuthorizedForDataset={isUserAuthorizedForDataset}
    />
  );
}
