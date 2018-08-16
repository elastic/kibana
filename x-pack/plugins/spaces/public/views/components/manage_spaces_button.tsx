/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React, { Component } from 'react';
import { MANAGE_SPACES_URL } from '../../lib/constants';

interface Props {
  isDisabled?: boolean;
}

export class ManageSpacesButton extends Component<Props, {}> {
  public render() {
    return (
      <EuiButton
        className="manage-spaces-button"
        isDisabled={this.props.isDisabled}
        onClick={this.navigateToManageSpaces}
      >
        Manage Spaces
      </EuiButton>
    );
  }

  private navigateToManageSpaces = () => {
    window.location.hash = MANAGE_SPACES_URL;
  };
}
