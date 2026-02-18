/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function Loading() {
  return (
    <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          {i18n.translate(
            'xpack.apm.traceWaterfallEmbeddable.loadingTraceWaterfallSkeletonTextLabel',
            { defaultMessage: 'Loading trace waterfall' }
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
