/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiPanel, EuiTitle } from '@elastic/eui';
import { IconType } from '@elastic/eui';
import React, { Component, Fragment } from 'react';

interface Props {
  iconType: IconType;
  title: string | React.ReactNode;
}

export class AccountSection extends Component<Props, {}> {
  public render() {
    return (
      <EuiPanel>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  public getTitle = () => {
    return (
      <EuiTitle>
        <h4>
          <EuiIcon type={this.props.iconType} size={'l'} className="accountSection__logo" />{' '}
          {this.props.title}
        </h4>
      </EuiTitle>
    );
  };

  public getForm = () => {
    return <Fragment>{this.props.children}</Fragment>;
  };
}
