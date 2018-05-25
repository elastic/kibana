/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import './collapsible_panel.less';
import {
  EuiPanel,
  EuiLink,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

export class CollapsiblePanel extends Component {
  static propTypes = {
    iconType: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }

  state = {
    collapsed: false
  }

  render() {
    return (
      <EuiPanel>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  getTitle = () => {
    return (
      <EuiFlexGroup alignItems={'baseline'}>
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <div>
              <EuiIcon type={this.props.iconType} size={'l'} className={'collapsiblePanel__logo'} /> {this.props.title}
            </div>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink size={'s'} onClick={this.toggleCollapsed}>{this.state.collapsed ? 'show' : 'hide'}</EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  getForm = () => {
    if (this.state.collapsed) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer />
        {this.props.children}
      </Fragment>
    );
  }

  toggleCollapsed = () => {
    this.setState({
      collapsed: !this.state.collapsed
    });
  }
}
