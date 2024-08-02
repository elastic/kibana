/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import { useDatasetQualityDetailsState } from '../../hooks/use_dataset_quality_details_state';
import { BasicDataStream } from '../../../common/types';

const Header = dynamic(() => import('./header'));
const Overview = dynamic(() => import('./overview'));

export function DatasetQualityDetails() {
  const { datasetDetails, timeRange } = useDatasetQualityDetailsState();
  const linkDetails: BasicDataStream = {
    name: datasetDetails.dataset,
    rawName: datasetDetails.rawName,
    type: datasetDetails.type,
    namespace: datasetDetails.namespace,
  };

  const title = datasetDetails.dataset;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <Header linkDetails={linkDetails} title={title} loading={false} timeRange={timeRange} />
        <EuiHorizontalRule />
        <Overview />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
