/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { TrustedApp } from '../../../../../../../../common/endpoint/types';

export interface ConditionEntryProps {
  // FIXME:PT probably need to adjust below types to match what is done in `TrustedApp` type
  os: TrustedApp['os'];
  entry: TrustedApp['entries'][0];
  isRemoveDisabled?: boolean;
}

export const ConditionEntry = memo<ConditionEntryProps>(() => {
  return <div>{'condition item'}</div>;
});

ConditionEntry.displayName = 'ConditionEntry';
