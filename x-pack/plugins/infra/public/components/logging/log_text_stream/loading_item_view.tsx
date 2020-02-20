/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import { EuiButtonEmpty, EuiIcon, EuiProgress, EuiText } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import * as React from 'react';

import { euiStyled } from '../../../../../observability/public';

interface LogTextStreamLoadingItemViewProps {
  alignment: 'top' | 'bottom';
  className?: string;
  hasMore: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  lastStreamingUpdate: Date | null;
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
                  defaultMessage=" last updated {lastUpdateTime}"
                  values={{
                    lastUpdateTime: (
                      <FormattedRelative value={lastStreamingUpdate} updateInterval={1000} />
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

const ProgressEntry: React.FC<ProgressEntryProps> = props => {
  const { alignment, children, className, color, isLoading } = props;

  // NOTE: styled-components seems to make all props in EuiProgress required, so this
  // style attribute hacking replaces styled-components here for now until that can be fixed
  // see: https://github.com/elastic/eui/issues/1655
  const alignmentStyle =
    alignment === 'top' ? { top: 0, bottom: 'initial' } : { top: 'initial', bottom: 0 };

  return (
    <ProgressEntryWrapper className={className}>
      <EuiProgress
        style={alignmentStyle}
        color={color}
        size="xs"
        position="absolute"
        {...(!isLoading ? { max: 1, value: 1 } : {})}
      />
      {children}
    </ProgressEntryWrapper>
  );
};

const ProgressEntryWrapper = euiStyled.div`
  align-items: center;
  display: flex;
  min-height: ${props => props.theme.eui.euiSizeXXL};
  position: relative;
`;

const ProgressMessage = euiStyled.div`
  padding: 8px 16px;
`;
