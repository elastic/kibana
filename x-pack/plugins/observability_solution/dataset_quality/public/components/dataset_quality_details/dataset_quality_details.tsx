/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { useDatasetDetailsTelemetry, useDatasetQualityDetailsState } from '../../hooks';
import { DataStreamNotFoundPrompt } from './index_not_found_prompt';
import { Header } from './header';
import { Overview } from './overview';
import { Details } from './details';

const DegradedFieldFlyout = dynamic(() => import('./quality_issue_flyout'));

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DatasetQualityDetails() {
  const { isIndexNotFoundError, dataStream, isDegradedFieldFlyoutOpen } =
    useDatasetQualityDetailsState();
  const { startTracking } = useDatasetDetailsTelemetry();

  useEffect(() => {
    startTracking();
  }, [startTracking]);
  return isIndexNotFoundError ? (
    <DataStreamNotFoundPrompt dataStream={dataStream} />
  ) : (
    <>
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="datasetDetailsContainer">
        <EuiFlexItem grow={false}>
          <Header />
          <EuiHorizontalRule />
          <Overview />
          <EuiHorizontalRule />
          <Details />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isDegradedFieldFlyoutOpen && <DegradedFieldFlyout />}
    </>
  );
}
