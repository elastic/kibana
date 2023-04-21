/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiProgress, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';

export const ChartLoader = ({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading: boolean;
}) => {
  const loadedOnce = useRef(false);
  const { euiTheme } = useEuiTheme();
  useEffect(() => {
    if (!loadedOnce.current && !loading) {
      loadedOnce.current = true;
    }
    return () => {
      loadedOnce.current = false;
    };
  }, [loading]);

  return (
    <div
      css={css`
        position: relative;
        border-radius: ${euiTheme.size.s};
        overflow: hidden;
        height: 100%;
      `}
    >
      {loading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          style={{ zIndex: Number(euiTheme.levels.header) - 1 }}
        />
      )}
      {loading && !loadedOnce.current ? (
        <EuiFlexGroup style={{ height: '100%' }} justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart mono size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        children
      )}
    </div>
  );
};
