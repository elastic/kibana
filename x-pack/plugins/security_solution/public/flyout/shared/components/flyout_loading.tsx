/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { FLYOUT_LOADING_TEST_ID } from '../test_ids';

/**
 * Use this when you need to show a loading state in the flyout
 */
export const FlyoutLoading: React.VFC = () => (
  <EuiFlexItem
    css={css`
      align-items: center;
      justify-content: center;
    `}
  >
    <EuiLoadingSpinner size="xxl" data-test-subj={FLYOUT_LOADING_TEST_ID} />
  </EuiFlexItem>
);

FlyoutLoading.displayName = 'FlyoutLoading';
