/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { memo } from 'react';
import { PlatformIcon } from '../../../../../components/endpoint_responder/components/platforms';
import { PolicyFormRowLayout } from './policy_form_row_layout';

export const PolicyFormHeader = memo(() => {
  return (
    <PolicyFormRowLayout
      label={<>&nbsp;</>}
      windows={<PlatformIdentifier type="windows" />}
      linux={<PlatformIdentifier type="linux" />}
      macos={<PlatformIdentifier type="macos" />}
    />
  );
});
PolicyFormHeader.displayName = 'PolicyFormHeader';

export interface PlatformIdentifierProps {
  type: 'windows' | 'linux' | 'macos';
}

const PlatformIdentifier = memo<PlatformIdentifierProps>(({ type }) => {
  return (
    <EuiFlexGroup responsive={false} gutterSize="s" justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <PlatformIcon platform={type} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{type}</h3>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
PlatformIdentifier.displayName = 'PlatformIdentifier';
