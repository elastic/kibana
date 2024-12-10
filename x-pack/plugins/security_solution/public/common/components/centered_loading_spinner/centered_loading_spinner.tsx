/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, useEuiTheme, type EuiLoadingSpinnerProps } from '@elastic/eui';

interface CenteredLoadingSpinnerProps extends EuiLoadingSpinnerProps {
  topOffset?: string;
}

export const CenteredLoadingSpinner = React.memo<CenteredLoadingSpinnerProps>(
  ({ topOffset, ...euiLoadingSpinnerProps }) => {
    const { euiTheme } = useEuiTheme();
    const style = useMemo(
      () => ({
        display: 'flex',
        margin: `${euiTheme.size.xl} auto`,
        ...(topOffset && { marginTop: topOffset }),
      }),
      [topOffset, euiTheme]
    );

    return <EuiLoadingSpinner {...euiLoadingSpinnerProps} style={style} />;
  }
);
CenteredLoadingSpinner.displayName = 'CenteredLoadingSpinner';
