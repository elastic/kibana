/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import {
  flyoutIntegrationDetailsText,
  flyoutIntegrationTypeText,
  flyoutIntegrationVersionText,
} from '../../../common/translations';
import { Integration } from '../../../common/data_streams_stats/integration';
import { IntegrationIcon } from '../common';

export function IntegrationSummary({ integration }: { integration: Integration }) {
  const { name, version } = integration;
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiTitle size="s">
        <span>{flyoutIntegrationDetailsText}</span>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs">
              <span>{flyoutIntegrationTypeText}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={4}>
            <EuiBadge
              color="hollow"
              css={css`
                width: fit-content;
              `}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <IntegrationIcon integration={integration} />
                <EuiText size="s">{name}</EuiText>
              </EuiFlexGroup>
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" />
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs">
              <span>{flyoutIntegrationVersionText}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={4}>{version}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
