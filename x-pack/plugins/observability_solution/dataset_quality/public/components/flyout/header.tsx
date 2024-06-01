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
  EuiFlyoutHeader,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import {
  flyoutOpenInDiscoverText,
  flyoutOpenInLogsExplorerText,
} from '../../../common/translations';
import { useRedirectLink } from '../../hooks';
import { FlyoutDataset } from '../../state_machines/dataset_quality_controller';
import { IntegrationIcon } from '../common';

export function Header({ dataStreamStat }: { dataStreamStat: FlyoutDataset }) {
  const { integration, title } = dataStreamStat;
  const euiShadow = useEuiShadow('s');
  const { euiTheme } = useEuiTheme();
  const redirectLinkProps = useRedirectLink({ dataStreamStat });

  return (
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow>
          <EuiFlexGroup gutterSize="m" justifyContent="flexStart" alignItems="center">
            <EuiTitle data-test-subj="datasetQualityFlyoutTitle">
              <h3>{title}</h3>
            </EuiTitle>
            <div
              css={css`
                ${euiShadow};
                padding: ${euiTheme.size.xs};
                border-radius: ${euiTheme.size.xxs};
              `}
            >
              <IntegrationIcon integration={integration} />
            </div>
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
              {...redirectLinkProps}
              iconType={
                redirectLinkProps.isLogsExplorerAvailable ? 'logoObservability' : 'discoverApp'
              }
            >
              {redirectLinkProps.isLogsExplorerAvailable
                ? flyoutOpenInLogsExplorerText
                : flyoutOpenInDiscoverText}
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
}
