/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const EmptyStateLoading = (props: any) => (
  <EuiEmptyPrompt
    title={
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="l">
            <h3>
              {i18n.translate('xpack.uptime.emptyState.loadingMessage', {
                defaultMessage: 'Loading…',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    }
  />
);
