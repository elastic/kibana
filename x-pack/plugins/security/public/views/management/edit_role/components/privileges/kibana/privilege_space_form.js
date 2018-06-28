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
} from '@elastic/eui';
import { PrivilegeSelector } from './privilege_selector';
import { SpaceSelector } from './space_selector';

export class PrivilegeSpaceForm extends Component {
  static propTypes = {
    availableSpaces: PropTypes.array.isRequired,
    selectedSpaceIds: PropTypes.array.isRequired,
    kibanaPrivileges: PropTypes.object.isRequired,
    selectedPrivilege: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
  }

  render() {
    const {
      availableSpaces,
      selectedSpaceIds,
      kibanaPrivileges,
      selectedPrivilege,
    } = this.props;

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <SpaceSelector spaces={availableSpaces} selectedSpaceIds={selectedSpaceIds} onChange={this.onSelectedSpacesChange} />
        </EuiFlexItem>
        <EuiFlexItem>
          <PrivilegeSelector kibanaPrivileges={kibanaPrivileges} value={selectedPrivilege} onChange={this.onPrivilegeChange} />
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
