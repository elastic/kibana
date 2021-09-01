/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { GLOBAL_EFFECT_SCOPE, POLICY_EFFECT_SCOPE } from './translations';
import { TextValueDisplay } from './text_value_display';

export interface EffectScopeProps {
  /** If set (even if empty), then effect scope will be policy specific. Else, it shows as global */
  policies?: string[];
}

export const EffectScope = memo<EffectScopeProps>(({ policies }) => {
  const [icon, label] = useMemo(() => {
    return policies
      ? ['partial', POLICY_EFFECT_SCOPE(policies.length)]
      : ['global', GLOBAL_EFFECT_SCOPE];
  }, [policies]);

  return (
    <EuiFlexGroup responsive={false} wrap={false} alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TextValueDisplay>{label}</TextValueDisplay>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
EffectScope.displayName = 'EffectScope';
