/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiPanel,
  EuiProgress,
  EuiTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { reduce } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHasData } from '../../../hooks/use_has_data';
import { useUiTracker } from '../../../hooks/use_track_metric';
import { useGuidedSetupProgress } from '../../../hooks/use_guided_setup_progress';

interface ObservabilityStatusProgressProps {
  onViewDetailsClick: () => void;
  onDismissClick?: () => void;
}
export function ObservabilityStatusProgress({
  onViewDetailsClick,
  onDismissClick,
}: ObservabilityStatusProgressProps) {
  const { hasDataMap, isAllRequestsComplete } = useHasData();
  const trackMetric = useUiTracker({ app: 'observability-overview' });
  const { isGuidedSetupProgressDismissed, dismissGuidedSetupProgress } = useGuidedSetupProgress();

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalCounts = Object.keys(hasDataMap);
    if (isAllRequestsComplete) {
      const hasDataCount = reduce(
        hasDataMap,
        (result, value) => {
          return value?.hasData ? result + 1 : result;
        },
        0
      );

      const percentage = (hasDataCount / totalCounts.length) * 100;
      setProgress(isFinite(percentage) ? percentage : 0);
    }
  }, [isAllRequestsComplete, hasDataMap]);

  const dismissGuidedSetup = useCallback(() => {
    dismissGuidedSetupProgress();
    if (onDismissClick) {
      onDismissClick();
    }
    trackMetric({ metric: 'guided_setup_progress_dismiss' });
  }, [dismissGuidedSetupProgress, trackMetric, onDismissClick]);

  const showDetails = () => {
    onViewDetailsClick();
    trackMetric({ metric: 'guided_setup_progress_view_details' });
  };

  return !isGuidedSetupProgressDismissed ? (
    <>
      <EuiPanel color="primary" data-test-subj="status-progress">
        <EuiProgress color="primary" value={progress} max={100} size="m" />
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h2>
                <FormattedMessage
                  id="xpack.observability.status.progressBarTitle"
                  defaultMessage="Guided setup for Observability"
                />
              </h2>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.observability.status.progressBarDescription"
                  defaultMessage="Track your progress towards adding observability integrations and features."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} direction="row" alignItems="center">
              <EuiFlexItem>
                <EuiButtonEmpty size="s" onClick={dismissGuidedSetup}>
                  <FormattedMessage
                    id="xpack.observability.status.progressBarDismiss"
                    defaultMessage="Dismiss"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton size="s" onClick={showDetails}>
                  <FormattedMessage
                    id="xpack.observability.status.progressBarViewDetails"
                    defaultMessage="View details"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer />
    </>
  ) : null;
}
