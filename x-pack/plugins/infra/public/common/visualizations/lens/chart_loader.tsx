/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiProgress, EuiFlexItem, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

export const ChartLoader = ({
  children,
  loading,
  style,
  loadedOnce = false,
  hasTitle = false,
}: {
  style?: React.CSSProperties;
  children: React.ReactNode;
  loadedOnce: boolean;
  loading: boolean;
  hasTitle?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <LoaderContainer>
      {loading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          css={css`
            top: ${loadedOnce && hasTitle ? euiTheme.size.l : 0};
            z-index: ${Number(euiTheme.levels.header) - 1};
          `}
        />
      )}
      {loading && !loadedOnce ? (
        <EuiFlexGroup
          style={{ ...style, marginTop: hasTitle ? euiTheme.size.l : 0 }}
          justifyContent="center"
          alignItems="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart mono size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        children
      )}
    </LoaderContainer>
  );
};

const LoaderContainer = euiStyled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.eui.euiSizeS};
  overflow: hidden;
  height: 100%;
`;
