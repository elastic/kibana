/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiHorizontalRule,
  EuiPanel,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { flyoutCancelText } from '../../../common/translations';
import { useDatasetQualityFlyout, useDatasetDetailsTelemetry } from '../../hooks';
import { DatasetSummary, DatasetSummaryLoading } from './dataset_summary';
import { Header } from './header';
import { IntegrationSummary } from './integration_summary';
import { FlyoutProps } from './types';
import { FlyoutSummary } from './flyout_summary/flyout_summary';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Flyout({ dataset, closeFlyout }: FlyoutProps) {
  const {
    dataStreamStat,
    dataStreamSettings,
    dataStreamDetails,
    isNonAggregatable,
    fieldFormats,
    timeRange,
    loadingState,
    flyoutLoading,
  } = useDatasetQualityFlyout();

  const { startTracking } = useDatasetDetailsTelemetry();

  useEffect(() => {
    startTracking();
  }, [startTracking]);

  return (
    <EuiFlyout
      onClose={closeFlyout}
      ownFocus={true}
      data-component-name={'datasetQualityFlyout'}
      data-test-subj="datasetQualityFlyout"
    >
      {flyoutLoading ? (
        <EuiSkeletonRectangle width="100%" height={80} />
      ) : (
        <>
          <Header dataStreamStat={dataset} />
          <EuiFlyoutBody css={flyoutBodyStyles} data-test-subj="datasetQualityFlyoutBody">
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
              <FlyoutSummary
                dataStream={dataset.rawName}
                dataStreamStat={dataStreamStat}
                dataStreamDetails={dataStreamDetails}
                dataStreamDetailsLoading={loadingState.dataStreamDetailsLoading}
                timeRange={timeRange}
                isNonAggregatable={isNonAggregatable}
              />
            </EuiPanel>

            <EuiHorizontalRule margin="none" />

            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
              {loadingState.dataStreamDetailsLoading && loadingState.dataStreamSettingsLoading ? (
                <DatasetSummaryLoading />
              ) : dataStreamStat ? (
                <Fragment>
                  <DatasetSummary
                    dataStreamSettings={dataStreamSettings}
                    dataStreamSettingsLoading={loadingState.dataStreamSettingsLoading}
                    dataStreamDetails={dataStreamDetails}
                    dataStreamDetailsLoading={loadingState.dataStreamDetailsLoading}
                    fieldFormats={fieldFormats}
                  />

                  {dataStreamStat.integration && (
                    <>
                      <EuiSpacer />
                      <IntegrationSummary
                        integration={dataStreamStat.integration}
                        dashboardsLoading={loadingState.datasetIntegrationsLoading}
                      />
                    </>
                  )}
                </Fragment>
              ) : null}
            </EuiPanel>
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="datasetQualityFlyoutButton"
                  iconType="cross"
                  onClick={closeFlyout}
                  flush="left"
                >
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

const flyoutBodyStyles = css`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;
