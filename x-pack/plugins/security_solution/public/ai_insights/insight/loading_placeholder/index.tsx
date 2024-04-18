/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiSkeletonTitle } from '@elastic/eui';
import React from 'react';

import { ActionsPlaceholder } from '../actions/actions_placeholder';
import { Title } from '../title';

const LoadingPlaceholderComponent: React.FC = () => (
  <EuiPanel data-test-subj="loadingPlaceholder" hasBorder={true}>
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={true}>
        <Title isLoading={true} title="" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ActionsPlaceholder />
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer size="l" />

    <EuiSkeletonTitle
      css={css`
        inline-size: 100%;
      `}
      data-test-subj="skeletonTitle"
      isLoading={true}
      size="l"
    />
  </EuiPanel>
);

LoadingPlaceholderComponent.displayName = 'LoadingPlaceholder';

export const LoadingPlaceholder = React.memo(LoadingPlaceholderComponent);
