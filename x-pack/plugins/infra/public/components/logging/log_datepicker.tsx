/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface LogDatepickerProps {
  startDateExpression: string;
  endDateExpression: string;
  isStreaming: boolean;
  onUpdateDateRange?: (range: { startDateExpression: string; endDateExpression: string }) => void;
  onStartStreaming?: () => void;
  onStopStreaming?: () => void;
}

export const LogDatepicker: React.FC<LogDatepickerProps> = ({
  startDateExpression,
  endDateExpression,
  isStreaming,
  onUpdateDateRange,
  onStartStreaming,
  onStopStreaming,
}) => {
  const handleTimeChange = useCallback(
    ({ start, end, isInvalid }) => {
      if (onUpdateDateRange && !isInvalid) {
        onUpdateDateRange({ startDateExpression: start, endDateExpression: end });
      }
    },
    [onUpdateDateRange]
  );

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiSuperDatePicker
          start={startDateExpression}
          end={endDateExpression}
          onTimeChange={handleTimeChange}
          showUpdateButton={false}
          // @ts-ignore: EuiSuperDatePicker doesn't expose the `isDisabled` prop, although it exists.
          isDisabled={isStreaming}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isStreaming ? (
          <EuiButton color="primary" iconType="pause" iconSide="left" onClick={onStopStreaming}>
            <FormattedMessage
              id="xpack.infra.logs.stopStreamingButtonLabel"
              defaultMessage="Stop streaming"
            />
          </EuiButton>
        ) : (
          <EuiButton color="primary" iconType="play" iconSide="left" onClick={onStartStreaming}>
            <FormattedMessage
              id="xpack.infra.logs.startStreamingButtonLabel"
              defaultMessage="Stream live"
            />
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
