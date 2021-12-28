/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPortal } from '@elastic/eui';

import { SyntheticsMonitor } from '../../../../common/runtime_types';

import { ActionBar } from './action_bar';

interface Props {
  portalSibling: HTMLElement;
  monitor: SyntheticsMonitor;
  isValid: boolean;
  onSave?: () => void;
}

export const ActionBarPortal = ({ portalSibling, ...rest }: Props) => {
  return (
    <EuiPortal insert={{ sibling: portalSibling, position: 'after' }}>
      <ActionBar {...rest} />
    </EuiPortal>
  );
};
