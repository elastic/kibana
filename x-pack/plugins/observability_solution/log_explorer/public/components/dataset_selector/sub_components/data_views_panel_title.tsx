/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { dataViewsLabel, openDiscoverLabel } from '../constants';

export const DataViewsPanelTitle = () => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>{dataViewsLabel}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge iconType="discoverApp">{openDiscoverLabel}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
