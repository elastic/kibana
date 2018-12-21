/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiIcon, EuiProgress, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
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
  onLoadMore?: () => void;
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
      onLoadMore,
    } = this.props;

    if (isStreaming) {
      return (
        <ProgressEntry alignment={alignment} className={className} color="primary" isLoading={true}>
          <ProgressMessage>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.infra.logs.streamingNewEntriesText"
                defaultMessage="Streaming new entries"
              />
            </EuiText>
          </ProgressMessage>
          {lastStreamingUpdate ? (
            <ProgressMessage>
              <EuiText color="subdued">
                <EuiIcon type="clock" />
                <FormattedMessage
                  id="xpack.infra.logs.lastStreamingUpdateText"
                  defaultMessage=" last updated {lastUpdateTime} ago"
                  values={{
                    lastUpdateTime: (
                      <RelativeTime time={lastStreamingUpdate} refreshInterval={1000} />
                    ),
                  }}
                />
              </EuiText>
            </ProgressMessage>
          ) : null}
        </ProgressEntry>
      );
    } else if (isLoading) {
      return (
        <ProgressEntry alignment={alignment} className={className} color="subdued" isLoading={true}>
          <ProgressMessage>
            <FormattedMessage
              id="xpack.infra.logs.loadingAdditionalEntriesText"
              defaultMessage="Loading additional entries"
            />
          </ProgressMessage>
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
          <ProgressMessage>
            <FormattedMessage
              id="xpack.infra.logs.noAdditionalEntriesFoundText"
              defaultMessage="No additional entries found"
            />
          </ProgressMessage>
          {onLoadMore ? (
            <EuiButtonEmpty size="xs" onClick={onLoadMore} iconType="refresh">
              <FormattedMessage
                id="xpack.infra.logs.loadAgainButtonLabel"
                defaultMessage="Load again"
              />
            </EuiButtonEmpty>
          ) : null}
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
        {children}
      </ProgressEntryWrapper>
    );
  }
}

const ProgressEntryWrapper = styled.div`
  align-items: center;
  display: flex;
  min-height: ${props => props.theme.eui.euiSizeXxl};
  position: relative;
`;

const ProgressMessage = styled.div`
  padding: 8px 16px;
`;

const AlignedProgress = styled(EuiProgress).attrs<{
  alignment: 'top' | 'bottom';
}>({})`
  top: ${props => (props.alignment === 'top' ? 0 : 'initial')};
  bottom: ${props => (props.alignment === 'top' ? 'initial' : 0)};
`;
