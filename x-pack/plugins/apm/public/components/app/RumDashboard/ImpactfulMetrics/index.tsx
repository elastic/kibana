/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiFlexGroup,
  EuiSpacer,
} from '@elastic/eui';
import { JSErrors } from './JSErrors';
import { I18LABELS } from '../translations';

export function ImpactfulMetrics() {
  return (
    <EuiPanel>
      <EuiTitle size="s">
        <h3>{I18LABELS.impactfulMetrics}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup wrap>
        <EuiFlexItem style={{ flexBasis: 650 }}>
          <JSErrors />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
