/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiStepsProps,
  EuiPanel,
  EuiText,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React from 'react';

export function StepStatus({
  status,
  title,
  message,
}: {
  status: EuiStepsProps['steps'][number]['status'];
  title: string;
  message?: string;
}) {
  if (status === 'loading') {
    return (
      <EuiFlexItem data-test-subj={`obltOnboardingStepStatus-${status}`}>
        <EuiPanel color="transparent">
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">{title}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    );
  }
  if (status === 'complete') {
    return (
      <EuiFlexItem data-test-subj={`obltOnboardingStepStatus-${status}`}>
        <EuiCallOut title={title} color="success" iconType="check">
          {message}
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  if (status === 'danger') {
    return (
      <EuiFlexItem data-test-subj={`obltOnboardingStepStatus-${status}`}>
        <EuiCallOut title={title} color="danger" iconType="warning">
          {message}
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  if (status === 'warning') {
    return (
      <EuiFlexItem data-test-subj={`obltOnboardingStepStatus-${status}`}>
        <EuiCallOut title={title} color="warning" iconType="warning">
          {message}
        </EuiCallOut>
      </EuiFlexItem>
    );
  }
  return null;
}
