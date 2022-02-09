/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import {
  ExpandableUserDetailsTitle,
  ExpandableUserDetailsPageLink,
  ExpandableUserDetails,
} from './expandable_user';

import { UserDetailsFlyout } from './user_details_flyout';
import { UserDetailsSidePanel } from './user_details_side_panel';

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
