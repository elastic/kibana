/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import styled from 'styled-components';
import { LOADING_VIEW } from '../series_builder/series_builder';

export function EmptyView({ loading, height }: { loading: boolean; height: string }) {
  return (
    <Wrapper height={height}>
      {loading && (
        <EuiProgress
          size="xs"
          color="accent"
          position="absolute"
          style={{
            top: 'initial',
          }}
        />
      )}
      <EuiSpacer />
      <FlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem>
          <EuiText>{LOADING_VIEW}</EuiText>
        </EuiFlexItem>
      </FlexGroup>
    </Wrapper>
  );
}

const Wrapper = styled.div<{ height: string }>`
  text-align: center;
  height: ${(props) => props.height};
  position: relative;
`;

const FlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;
