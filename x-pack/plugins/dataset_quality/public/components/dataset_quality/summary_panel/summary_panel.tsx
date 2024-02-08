/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup } from '@elastic/eui';
import { DatasetsQualityIndicators } from './datasets_quality_indicators';
import { ActiveDatasets } from './active_datasets';
import { EstimatedData } from './estimated_data';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function SummaryPanel() {
  return (
    <EuiFlexGroup gutterSize="m">
      <DatasetsQualityIndicators />
      <EuiFlexGroup gutterSize="m">
        <ActiveDatasets />
        <EstimatedData />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
