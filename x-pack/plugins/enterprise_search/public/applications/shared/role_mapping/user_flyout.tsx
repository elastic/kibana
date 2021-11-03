/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPortal,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

interface Props {
  children: React.ReactNode;
  isNew: boolean;
  isComplete: boolean;
  disabled: boolean;
  formLoading: boolean;
  closeUserFlyout(): void;
  handleSaveUser(): void;
}

import { CANCEL_BUTTON_LABEL, CLOSE_BUTTON_LABEL } from '../constants';

import {
  USERS_HEADING_LABEL,
  UPDATE_USER_LABEL,
  ADD_USER_LABEL,
  USER_ADDED_LABEL,
  USER_UPDATED_LABEL,
  NEW_USER_DESCRIPTION,
  UPDATE_USER_DESCRIPTION,
} from './constants';

export const UserFlyout: React.FC<Props> = ({
  children,
  isNew,
  isComplete,
  disabled,
  formLoading,
  closeUserFlyout,
  handleSaveUser,
}) => {
  const savedIcon = (
    <EuiIcon
      color="success"
      size="l"
      type="checkInCircleFilled"
      style={{ marginLeft: 5, marginTop: -5 }}
    />
  );
  const IS_EDITING_HEADING = isNew ? USERS_HEADING_LABEL : UPDATE_USER_LABEL;
  const IS_EDITING_DESCRIPTION = isNew ? NEW_USER_DESCRIPTION : UPDATE_USER_DESCRIPTION;
  const USER_SAVED_HEADING = isNew ? USER_ADDED_LABEL : USER_UPDATED_LABEL;
  const IS_COMPLETE_HEADING = (
    <span>
      {USER_SAVED_HEADING} {savedIcon}
    </span>
  );

  const editingFooterActions = (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={closeUserFlyout}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton disabled={disabled} isLoading={formLoading} onClick={handleSaveUser} fill>
          {isNew ? ADD_USER_LABEL : UPDATE_USER_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const completedFooterAction = (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={closeUserFlyout}>
          {CLOSE_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={closeUserFlyout} size="s" aria-labelledby="userFlyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="userFlyoutTitle">{isComplete ? IS_COMPLETE_HEADING : IS_EDITING_HEADING}</h2>
          </EuiTitle>
          {!isComplete && (
            <EuiText size="xs">
              <p>{IS_EDITING_DESCRIPTION}</p>
            </EuiText>
          )}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {children}
          <EuiSpacer />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          {isComplete ? completedFooterAction : editingFooterActions}
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
