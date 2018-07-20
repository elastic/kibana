/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonIcon,
} from '@elastic/eui';
import { PrivilegeSelector } from './privilege_selector';
import { SpaceSelector } from './space_selector';

export class PrivilegeSpaceForm extends Component {
  static propTypes = {
    availableSpaces: PropTypes.array.isRequired,
    selectedSpaceIds: PropTypes.array.isRequired,
    availablePrivileges: PropTypes.array.isRequired,
    selectedPrivilege: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
  }

  render() {
    const {
      availableSpaces,
      selectedSpaceIds,
      availablePrivileges,
      selectedPrivilege,
    } = this.props;

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiFormRow label={"Space(s)"}>
            <SpaceSelector spaces={availableSpaces} selectedSpaceIds={selectedSpaceIds} onChange={this.onSelectedSpacesChange} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={"Privilege"}>
            <PrivilegeSelector availablePrivileges={availablePrivileges} value={selectedPrivilege} onChange={this.onPrivilegeChange} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButtonIcon aria-label={'Delete space privilege'} color={'danger'} onClick={this.props.onDelete} iconType={'trash'} />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  onSelectedSpacesChange = (selectedSpaceIds) => {

    this.props.onChange({
      selectedSpaceIds,
      selectedPrivilege: this.props.selectedPrivilege
    });
  }

  onPrivilegeChange = (selectedPrivilege) => {

    this.props.onChange({
      selectedSpaceIds: this.props.selectedSpaceIds,
      selectedPrivilege
    });
  }
}
