/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import React, { Component, Fragment, ReactNode } from 'react';

interface Props {
  iconType?: IconType;
  title: string | ReactNode;
  description: string;
}

export class SectionPanel extends Component<Props, {}> {
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
      <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>
              {this.props.iconType && (
                <Fragment>
                  <EuiIcon
                    type={this.props.iconType}
                    size={'xl'}
                    className={'spcSectionPanel__collapsiblePanelLogo'}
                  />{' '}
                </Fragment>
              )}
              {this.props.title}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  public getForm = () => {
    return (
      <Fragment>
        <EuiSpacer />
        {this.props.children}
      </Fragment>
    );
  };
}
