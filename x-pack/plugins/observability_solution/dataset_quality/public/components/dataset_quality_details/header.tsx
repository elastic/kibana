/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonTitle,
  EuiTextColor,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { openInDiscoverText, openInLogsExplorerText } from '../../../common/translations';
import { useDatasetQualityDetailsRedirectLink, useDatasetQualityDetailsState } from '../../hooks';
import { IntegrationIcon } from '../common';

export function Header() {
  const { datasetDetails, timeRange, integrationDetails, loadingState } =
    useDatasetQualityDetailsState();

  const { rawName, name: title } = datasetDetails;
  const euiShadow = useEuiShadow('s');
  const { euiTheme } = useEuiTheme();
  const redirectLinkProps = useDatasetQualityDetailsRedirectLink({
    dataStreamStat: datasetDetails,
    timeRangeConfig: timeRange,
  });

  const pageTitle = integrationDetails?.integration?.datasets?.[datasetDetails.name] ?? title;

  return !loadingState.integrationDetailsLoaded ? (
    <EuiSkeletonTitle
      size="s"
      data-test-subj="datasetQualityFlyoutIntegrationLoading"
      className="datasetQualityFlyoutIntegrationLoading"
    />
  ) : (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiFlexItem grow>
        <EuiFlexGroup gutterSize="m" alignItems="flexStart" direction="column">
          <EuiFlexGroup gutterSize="m" justifyContent="flexStart" alignItems="center">
            <EuiTitle data-test-subj="datasetQualityFlyoutTitle" size="l">
              <h2>{pageTitle}</h2>
            </EuiTitle>
            <div
              css={css`
                ${euiShadow};
                padding: ${euiTheme.size.xs};
                border-radius: ${euiTheme.size.xxs};
              `}
            >
              <IntegrationIcon integration={integrationDetails?.integration} />
            </div>
          </EuiFlexGroup>
          <p>
            <EuiTextColor color="subdued">{rawName}</EuiTextColor>
          </p>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          css={css`
            margin-right: ${euiTheme.size.l};
          `}
          gutterSize="s"
          justifyContent="flexEnd"
          alignItems="center"
        >
          <EuiButton
            data-test-subj="datasetQualityHeaderButton"
            size="s"
            {...redirectLinkProps.linkProps}
            iconType={
              redirectLinkProps.isLogsExplorerAvailable ? 'logoObservability' : 'discoverApp'
            }
          >
            {redirectLinkProps.isLogsExplorerAvailable
              ? openInLogsExplorerText
              : openInDiscoverText}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
