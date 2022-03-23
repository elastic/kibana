/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
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

const LOCAL_STORAGE_HIDE_GUIDED_SETUP_KEY = 'HIDE_GUIDED_SETUP';

interface ObservabilityStatusProgressProps {
  onViewDetailsClick: () => {};
}
export function ObservabilityStatusProgress({
  onViewDetailsClick,
}: ObservabilityStatusProgressProps) {
  const { hasDataMap, isAllRequestsComplete } = useHasData();
  const hideGuidedSetupLocalStorageKey = window.localStorage.getItem(
    LOCAL_STORAGE_HIDE_GUIDED_SETUP_KEY
  );
  const [isGuidedSetupHidden, setIsGuidedSetupHidden] = useState(
    JSON.parse(hideGuidedSetupLocalStorageKey || 'false')
  );

  const hideGuidedSetup = () => {
    window.localStorage.setItem(LOCAL_STORAGE_HIDE_GUIDED_SETUP_KEY, 'true');
    setIsGuidedSetupHidden(true);
  };
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

  const [progress, setProgress] = useState(0);
  return !isGuidedSetupHidden ? (
    <>
      <EuiPanel color="primary">
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
                <EuiButtonEmpty size="s" onClick={hideGuidedSetup}>
                  <FormattedMessage
                    id="xpack.observability.status.progressBarDismiss"
                    defaultMessage="Dismiss"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton size="s" onClick={onViewDetailsClick}>
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
