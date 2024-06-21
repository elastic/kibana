/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { Component, Fragment } from 'react';

interface Props {
  iconType?: IconType;
  title: string | ReactNode;
  dataTestSubj?: string;
}

export class SectionPanel extends Component<Props, {}> {
  public render() {
    return (
      <EuiPanel hasShadow={false} hasBorder={true} data-test-subj={this.props.dataTestSubj}>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  public getTitle = () => {
    return (
      <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
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
