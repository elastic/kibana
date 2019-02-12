/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonEmpty,
  // @ts-ignore
  EuiCard,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { User } from '../../../../../common/model/user';

interface Props {
  user: User;
}

interface State {
  showForm: boolean;
}

export class ManageAPIKeys extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showForm: false,
    };
  }

  public render() {
    const manageKeysTitle = (
      <FormattedMessage
        id="xpack.security.account.manageAPIKeysTitle"
        defaultMessage="Manage API Keys"
      />
    );
    return (
      <EuiDescribedFormGroup
        title={<h3>{manageKeysTitle}</h3>}
        description={
          <p>
            <FormattedMessage
              id="xpack.security.account.manageAPIKeysDescription"
              defaultMessage="API Keys are used to grant access to your account without requiring your password."
            />
          </p>
        }
      >
        <EuiFormRow hasEmptyLabelSpace={true}>
          {this.state.showForm ? (
            this.getForm()
          ) : (
            <EuiButtonEmpty onClick={() => this.setState({ showForm: true })}>
              {manageKeysTitle}
            </EuiButtonEmpty>
          )}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  private getForm = () => {
    return <EuiText>Something goes here</EuiText>;
  };
}
