/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserDetailsFlyout } from './user_details_flyout';
import { UserDetailsSidePanel } from './user_details_side_panel';
import type { UserDetailsProps } from './types';

const UserDetailsPanelComponent = ({
  contextID,
  userName,
  handleOnClose,
  isFlyoutView,
  isDraggable,
}: UserDetailsProps) => {
  return isFlyoutView ? (
    <UserDetailsFlyout userName={userName} contextID={contextID} />
  ) : (
    <UserDetailsSidePanel
      userName={userName}
      contextID={contextID}
      isDraggable={isDraggable}
      handleOnClose={handleOnClose}
    />
  );
};

export const UserDetailsPanel = React.memo(UserDetailsPanelComponent);
