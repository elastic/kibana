/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexItem,
  EuiColorPicker,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
} from '@elastic/eui';

export class CustomizeSpaceAvatar extends Component {
  static propTypes = {
    space: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
  }

  state = {
    expanded: false
  }

  render() {
    return this.state.expanded ? this.getCustomizeFields() : this.getCustomizeLink();
  }

  getCustomizeFields = () => {
    return (
      <Fragment>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={'Initials (2 max)'}>
            <EuiFieldText name="spaceInitials" value={''} onChange={() => { }} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={'Color'}>
            <EuiColorPicker color="#ffffff" onChange={() => { }} />
          </EuiFormRow>
        </EuiFlexItem>
      </Fragment>
    );
  }

  getCustomizeLink = () => {
    return (
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace={true}>
          <EuiLink onClick={this.showFields}>Customize</EuiLink>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  showFields = () => {
    this.setState({
      expanded: true
    });
  }
}
