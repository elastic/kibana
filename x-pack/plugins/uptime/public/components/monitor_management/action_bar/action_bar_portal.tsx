/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { ActionBarPortalNode } from '../../../pages/monitor_management/action_bar_portal_node';

import { SyntheticsMonitor } from '../../../../common/runtime_types';

import { ActionBar } from './action_bar';

interface Props {
  monitor: SyntheticsMonitor;
  isValid: boolean;
  onSave?: () => void;
}

export const ActionBarPortal = (props: Props) => {
  return (
    <InPortal node={ActionBarPortalNode}>
      <ActionBar {...props} />
    </InPortal>
  );
};
