/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutBody, EuiSpacer, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { UserDetailsFlyout } from './user_details_flyout';
import { UserDetailsSidePanel } from './user_details_side_panel';
import type { UserDetailsProps } from './types';
import { UserDetailsContent } from '../new_user_detail/user_details_content';
import * as i18n from './translations';

const UserDetailsPanelComponent = ({
  contextID,
  scopeId,
  userName,
  handleOnClose,
  isFlyoutView,
  isDraggable,
  isNewUserDetailsFlyoutEnable,
}: UserDetailsProps) => {
  if (isNewUserDetailsFlyoutEnable) {
    return isFlyoutView ? (
      <EuiFlyoutBody>
        <UserDetailsContent
          userName={userName}
          contextID={contextID}
          scopeId={scopeId}
          isDraggable={isDraggable}
        />
      </EuiFlyoutBody>
    ) : (
      <div className="eui-yScroll">
        <EuiSpacer size="m" />
        <EuiButtonIcon
          iconType="cross"
          aria-label={i18n.CLOSE_BUTTON}
          onClick={handleOnClose}
          css={css`
            float: right;
          `}
        />

        <UserDetailsContent
          userName={userName}
          contextID={contextID}
          scopeId={scopeId}
          isDraggable={isDraggable}
        />
      </div>
    );
  }

  return isFlyoutView ? (
    <UserDetailsFlyout userName={userName} contextID={contextID} scopeId={scopeId} />
  ) : (
    <UserDetailsSidePanel
      userName={userName}
      contextID={contextID}
      isDraggable={isDraggable}
      handleOnClose={handleOnClose}
      scopeId={scopeId}
    />
  );
};

export const UserDetailsPanel = React.memo(UserDetailsPanelComponent);
