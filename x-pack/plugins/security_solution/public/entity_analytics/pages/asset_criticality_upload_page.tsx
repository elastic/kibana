/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { AssetCriticalityFileUploader } from '../components/asset_criticality_file_uploader';

export const AssetCriticalityUploadPage = () => {
  return (
    <>
      <EuiPageHeader
        pageTitle={'Asset classification'} // TODO i18n
      />
      <EuiHorizontalRule />

      <EuiSpacer size="l" />

      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={2}>
          {'Quickly Assign Asset Criticality with CSV Upload'}
          {
            'Effortlessly import asset criticality from your asset management tools via CSV. This simple upload ensures data accuracy and reduces manual input errors.'
          }
          <AssetCriticalityFileUploader />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder={true}>
            {'icon'}
            {'What is assets criticality?'}
            {
              'Categorizes assets based on their value and impact on business operations, guiding prioritization for protection and resource allocation.'
            }
            <EuiHorizontalRule />
            {'Useful links'}
            {'Asset classification documentation'}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

AssetCriticalityUploadPage.displayName = 'AssetCriticalityUploadPage';
