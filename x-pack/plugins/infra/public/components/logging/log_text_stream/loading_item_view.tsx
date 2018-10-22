/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiProgress, EuiText } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { RelativeTime } from './relative_time';

interface LogTextStreamLoadingItemViewProps {
  alignment: 'top' | 'bottom';
  className?: string;
  hasMore: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  lastStreamingUpdate: number | null;
}

export class LogTextStreamLoadingItemView extends React.PureComponent<
  LogTextStreamLoadingItemViewProps,
  {}
> {
  public render() {
    const {
      alignment,
      className,
      hasMore,
      isLoading,
      isStreaming,
      lastStreamingUpdate,
    } = this.props;

    if (isStreaming) {
      return (
        <ProgressEntry alignment={alignment} className={className} color="primary" isLoading={true}>
          <EuiText color="subdued">
            Streaming new entries
            {lastStreamingUpdate ? (
              <>
                : last updated <RelativeTime time={lastStreamingUpdate} refreshInterval={1000} />{' '}
                ago
              </>
            ) : null}
          </EuiText>
        </ProgressEntry>
      );
    } else if (isLoading) {
      return (
        <ProgressEntry alignment={alignment} className={className} color="subdued" isLoading={true}>
          Loading additional entries
        </ProgressEntry>
      );
    } else if (!hasMore) {
      return (
        <ProgressEntry
          alignment={alignment}
          className={className}
          color="subdued"
          isLoading={false}
        >
          No additional entries found
        </ProgressEntry>
      );
    } else {
      return null;
    }
  }
}

interface ProgressEntryProps {
  alignment: 'top' | 'bottom';
  className?: string;
  color: 'subdued' | 'primary';
  isLoading: boolean;
}

// tslint:disable-next-line:max-classes-per-file
class ProgressEntry extends React.PureComponent<ProgressEntryProps, {}> {
  public render() {
    const { alignment, children, className, color, isLoading } = this.props;

    return (
      <ProgressEntryWrapper className={className}>
        <AlignedProgress
          alignment={alignment}
          color={color}
          max={isLoading ? undefined : 1}
          size="xs"
          value={isLoading ? undefined : 1}
          position="absolute"
        />
        <ProgressTextDiv>{children}</ProgressTextDiv>
      </ProgressEntryWrapper>
    );
  }
}

const ProgressEntryWrapper = styled.div`
  position: relative;
`;

const ProgressTextDiv = styled.div`
  padding: 8px 16px;
`;

const AlignedProgress = styled(EuiProgress).attrs<{
  alignment: 'top' | 'bottom';
}>({})`
  top: ${props => (props.alignment === 'top' ? 0 : 'initial')};
  bottom: ${props => (props.alignment === 'top' ? 'initial' : 0)};
`;
