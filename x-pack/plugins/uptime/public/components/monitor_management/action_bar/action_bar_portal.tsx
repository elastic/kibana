/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { ActionBarPortalNode } from '../../../pages/monitor_management/action_bar_portal_node';

import { ActionBar, ActionBarProps } from './action_bar';

export const ActionBarPortal = (props: ActionBarProps) => {
  return (
    <InPortal node={ActionBarPortalNode}>
      <ActionBar {...props} />
    </InPortal>
  );
};
