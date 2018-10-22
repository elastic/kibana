/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React, { Component, CSSProperties } from 'react';
import { UserProfile } from '../../../xpack_main/public/services/user_profile';
import { MANAGE_SPACES_URL } from '../lib/constants';

interface Props {
  isDisabled?: boolean;
  size?: 's' | 'l';
  style?: CSSProperties;
  userProfile: UserProfile;
  onClick?: () => void;
}

export class ManageSpacesButton extends Component<Props, {}> {
  public render() {
    if (!this.props.userProfile.hasCapability('manageSpaces')) {
      return null;
    }

    return (
      <EuiButton
        size={this.props.size || 's'}
        className="manage-spaces-button"
        isDisabled={this.props.isDisabled}
        onClick={this.navigateToManageSpaces}
        style={this.props.style}
      >
        Manage spaces
      </EuiButton>
    );
  }

  private navigateToManageSpaces = () => {
    if (this.props.onClick) {
      this.props.onClick();
    }
    window.location.replace(MANAGE_SPACES_URL);
  };
}
