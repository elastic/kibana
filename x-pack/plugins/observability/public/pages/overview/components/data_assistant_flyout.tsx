/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlyoutBody,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ObservabilityStatus } from '../../../components/app/observability_status';

interface DataAsssistantFlyoutProps {
  onClose: () => void;
}

export function DataAssistantFlyout({ onClose }: DataAsssistantFlyoutProps) {
  return (
    <EuiFlyout
      ownFocus
      aria-labelledby="statusVisualizationFlyoutTitle"
      className="oblt__flyout"
      size="s"
      onClose={onClose}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="statusVisualizationFlyoutTitle" data-test-subj="statusVisualizationFlyoutTitle">
            <FormattedMessage
              id="xpack.observability.overview.statusVisualizationFlyoutTitle"
              defaultMessage="Data assistant"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.observability.overview.statusVisualizationFlyoutDescription"
              defaultMessage="Track your progress towards adding observability integrations and features."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ObservabilityStatus />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
