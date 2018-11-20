/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React, { Component, CSSProperties } from 'react';
import { UserProfile } from '../../../xpack_main/public/services/user_profile';
import { MANAGE_SPACES_URL } from '../lib/constants';

interface Props {
  isDisabled?: boolean;
  className?: string;
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
        className={this.props.className}
        isDisabled={this.props.isDisabled}
        onClick={this.navigateToManageSpaces}
        style={this.props.style}
      >
<<<<<<< HEAD
        Manage spaces
=======
        <FormattedMessage
          id="xpack.spaces.manageSpacesButton.manageSpacesButtonLabel"
          defaultMessage="Manage spaces"
        />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
