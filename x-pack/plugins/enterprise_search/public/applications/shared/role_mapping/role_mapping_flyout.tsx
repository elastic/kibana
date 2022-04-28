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
  EuiPortal,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { CANCEL_BUTTON_LABEL } from '../constants/actions';

import {
  ROLE_MAPPING_FLYOUT_CREATE_TITLE,
  ROLE_MAPPING_FLYOUT_UPDATE_TITLE,
  ROLE_MAPPING_FLYOUT_DESCRIPTION,
  ROLE_MAPPING_FLYOUT_CREATE_BUTTON,
  ROLE_MAPPING_FLYOUT_UPDATE_BUTTON,
} from './constants';

interface Props {
  children: React.ReactNode;
  isNew: boolean;
  disabled: boolean;
  formLoading: boolean;
  closeUsersAndRolesFlyout(): void;
  handleSaveMapping(): void;
}

export const RoleMappingFlyout: React.FC<Props> = ({
  children,
  isNew,
  disabled,
  formLoading,
  closeUsersAndRolesFlyout,
  handleSaveMapping,
}) => (
  <EuiPortal>
    <EuiFlyout
      ownFocus
      onClose={closeUsersAndRolesFlyout}
      size="s"
      aria-labelledby="flyoutLargeTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutLargeTitle" data-test-subj="FlyoutTitle">
            {isNew ? ROLE_MAPPING_FLYOUT_CREATE_TITLE : ROLE_MAPPING_FLYOUT_UPDATE_TITLE}
          </h2>
        </EuiTitle>
        <EuiText size="xs">
          <p>{ROLE_MAPPING_FLYOUT_DESCRIPTION}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {children}
        <EuiSpacer />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeUsersAndRolesFlyout}>
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={disabled}
              isLoading={formLoading}
              onClick={handleSaveMapping}
              fill
              data-test-subj="FlyoutButton"
            >
              {isNew ? ROLE_MAPPING_FLYOUT_CREATE_BUTTON : ROLE_MAPPING_FLYOUT_UPDATE_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  </EuiPortal>
);
