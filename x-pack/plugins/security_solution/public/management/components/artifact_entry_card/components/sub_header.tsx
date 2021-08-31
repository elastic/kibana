/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TouchedByUsers, TouchedByUsersProps } from './touched_by_users';
import { EffectScope, EffectScopeProps } from './effect_scope';

export type SubHeaderProps = TouchedByUsersProps & EffectScopeProps;

export const SubHeader = memo<SubHeaderProps>(({ createdBy, updatedBy, policies }) => {
  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <TouchedByUsers createdBy={createdBy} updatedBy={updatedBy} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EffectScope policies={policies} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
SubHeader.displayName = 'SubHeader';
