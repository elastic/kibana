/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { I18LABELS } from '../translations';
import { ClickMap } from '../click_map';

export function ClickMapPanel() {
  return (
    <EuiPanel hasBorder={true}>
      <EuiTitle size="xs">
        <h3>{I18LABELS.clickMap}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup wrap>
        <EuiFlexItem style={{ flexBasis: 650 }}>
          <ClickMap />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
