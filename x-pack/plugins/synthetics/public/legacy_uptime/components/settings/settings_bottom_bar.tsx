/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OutPortal, createPortalNode, InPortal } from 'react-reverse-portal';
import { SettingsActions, SettingsActionsProps } from './settings_actions';

export const SettingsBottomBar = () => {
  return (
    <div>
      <OutPortal node={SettingsBarPortalNode} />
    </div>
  );
};

export const SettingsActionBarPortal = (props: SettingsActionsProps) => {
  return (
    <InPortal node={SettingsBarPortalNode}>
      <SettingsActions {...props} />
    </InPortal>
  );
};
export const SettingsBarPortalNode = createPortalNode();
