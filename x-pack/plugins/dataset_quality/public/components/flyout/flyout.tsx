/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLoadingLogo,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { flyoutCancelText } from '../../../common/translations';
import { useDatasetQualityFlyout } from '../../hooks';
import { DatasetSummary } from './dataset_summary';
import { Header } from './header';
import { IntegrationSummary } from './integration_summary';

interface FlyoutProps {
  datasetName: string;
  closeFlyout: () => void;
}

export function Flyout({ datasetName, closeFlyout }: FlyoutProps) {
  const { dataStreamStat, loading, fieldFormats } = useDatasetQualityFlyout({
    datasetQuery: datasetName,
  });

  return (
    <EuiFlyout onClose={closeFlyout} ownFocus={false} data-component-name={'datasetQualityFlyout'}>
      {loading ? (
        <EuiFlyoutBody>
          <EuiFlexGroup justifyContent="center">
            <EuiLoadingLogo logo="logoObservability" size="l" />
          </EuiFlexGroup>
        </EuiFlyoutBody>
      ) : (
        <>
          <Header dataStreamStat={dataStreamStat} />
          <EuiFlyoutBody>
            <DatasetSummary dataStreamStat={dataStreamStat} fieldFormats={fieldFormats} />
            <EuiSpacer />
            {dataStreamStat.integration && (
              <IntegrationSummary integration={dataStreamStat.integration} />
            )}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                  {flyoutCancelText}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyout>
  );
}
