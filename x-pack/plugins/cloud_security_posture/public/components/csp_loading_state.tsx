/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

export const CspLoadingState: React.FunctionComponent<{ ['data-test-subj']?: string }> = ({
  children,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      css={css`
        padding: ${euiTheme.size.l};
        margin-top: 50px;
      `}
      direction="column"
      alignItems="center"
      data-test-subj={rest['data-test-subj']}
    >
      <EuiFlexItem>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
