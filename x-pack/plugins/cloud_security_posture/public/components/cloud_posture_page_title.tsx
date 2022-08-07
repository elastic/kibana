/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';

export const CloudPosturePageTitle = ({ title, isBeta }: { title: string; isBeta: boolean }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiTitle>
        <h1>{title}</h1>
      </EuiTitle>
    </EuiFlexItem>
    {isBeta && (
      <EuiFlexItem grow={false}>
        <EuiBetaBadge label={'Beta'} />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
