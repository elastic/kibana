/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import type { CSSProperties } from 'react';
import React, { Component } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { ApplicationStart, Capabilities } from 'src/core/public';

interface Props {
  isDisabled?: boolean;
  className?: string;
  size?: 's' | 'm';
  style?: CSSProperties;
  onClick?: () => void;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
}

export class ManageSpacesButton extends Component<Props, {}> {
  public render() {
    if (!this.props.capabilities.spaces.manage) {
      return null;
    }

    return (
      <EuiButton
        size={this.props.size || 's'}
        className={this.props.className}
        isDisabled={this.props.isDisabled}
        onClick={this.navigateToManageSpaces}
        style={this.props.style}
        data-test-subj="manageSpaces"
      >
        <FormattedMessage
          id="xpack.spaces.manageSpacesButton.manageSpacesButtonLabel"
          defaultMessage="Manage spaces"
        />
      </EuiButton>
    );
  }

  private navigateToManageSpaces = () => {
    if (this.props.onClick) {
      this.props.onClick();
    }

    this.props.navigateToApp('management', { path: 'kibana/spaces' });
  };
}
