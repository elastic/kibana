/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { Component } from 'react';
import { User } from '../../../../../common/model/user';
import { ManageAPIKeys } from '../api_keys';
import { ChangePassword } from '../change_password';

interface Props {
  user: User;
}

export class SecurityPanel extends Component<Props, {}> {
  public render() {
    return (
      <div>
        <h3>Security</h3>
        <EuiSpacer />
        <ChangePassword user={this.props.user} />
        <ManageAPIKeys user={this.props.user} />
      </div>
    );
  }
}
