/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export function CorrelationsProgressControls({
  progress,
  onRefresh,
  onCancel,
  isRunning,
}: {
  progress: number;
  onRefresh: () => void;
  onCancel: () => void;
  isRunning: boolean;
}) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem data-test-subj="apmCorrelationsProgressTitle">
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                data-test-subj="apmCorrelationsProgressTitleMessage"
                id="xpack.apm.correlations.progressTitle"
                defaultMessage="Progress: {progress}%"
                values={{ progress: Math.round(progress * 100) }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress
              aria-label={i18n.translate(
                'xpack.apm.correlations.progressAriaLabel',
                { defaultMessage: 'Progress' }
              )}
              value={Math.round(progress * 100)}
              max={100}
              size="m"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {!isRunning && (
          <EuiButton size="s" onClick={onRefresh}>
            <FormattedMessage
              id="xpack.apm.correlations.refreshButtonTitle"
              defaultMessage="Refresh"
            />
          </EuiButton>
        )}
        {isRunning && (
          <EuiButton size="s" onClick={onCancel}>
            <FormattedMessage
              id="xpack.apm.correlations.cancelButtonTitle"
              defaultMessage="Cancel"
            />
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
