/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { useGuidedSetupProgress } from '../../../../hooks/use_guided_setup_progress';

interface ObservabilityStatusProgressProps {
  onViewDetailsClick: () => void;
  onDismissClick?: () => void;
}
export function ObservabilityStatusProgress({
  onViewDetailsClick,
  onDismissClick,
}: ObservabilityStatusProgressProps) {
  const trackMetric = useUiTracker({ app: 'observability-overview' });
  const { isGuidedSetupProgressDismissed, dismissGuidedSetupProgress } = useGuidedSetupProgress();

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
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h2>
                <FormattedMessage
                  id="xpack.observability.status.progressBarTitle"
                  defaultMessage="Data assistant for Observability"
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
                <EuiButtonEmpty
                  data-test-subj="o11yObservabilityStatusProgressDismissButton"
                  size="s"
                  onClick={dismissGuidedSetup}
                >
                  <FormattedMessage
                    id="xpack.observability.status.progressBarDismiss"
                    defaultMessage="Dismiss"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton
                  data-test-subj="o11yObservabilityStatusProgressViewDetailsButton"
                  size="s"
                  onClick={showDetails}
                >
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
