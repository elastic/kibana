/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiSwitch,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiTitle,
  EuiSpacer,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
} from '@elastic/eui';
import { PrivilegeSpaceSelector } from './privilege_space_selector';
import { createRolePrivilege, getRolePrivilege } from '../../../lib/role_privilege';

const ALL_SPACES_RESOURCE = '*';

export class PrivilegeSpaceForm extends Component {
  static propTypes = {
    spaces: PropTypes.array.isRequired,
    appPrivilege: PropTypes.object.isRequired,
    role: PropTypes.object.isRequired,
    rbacApplication: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
  }

  render() {
    const {
      appPrivilege,
      role,
      rbacApplication,
    } = this.props;

    const rolePrivilege = getRolePrivilege(appPrivilege.name, role, rbacApplication);

    const {
      resources
    } = rolePrivilege || {};

    const allSelected = resources ? resources[0] === ALL_SPACES_RESOURCE : false;

    const buttonContent = (
      <div>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h6>{appPrivilege.name}</h6>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>
                    <EuiTextColor color="subdued">
                      {appPrivilege.description || 'no description available'}
                    </EuiTextColor>
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" direction="column">
              <EuiFlexItem grow={false}>
                <EuiSwitch checked={!!rolePrivilege} onChange={this.onPrivilegeToggle} label="enabled" />
              </EuiFlexItem>
              <EuiFlexItem>
                {rolePrivilege
                  ? <EuiSwitch checked={!allSelected} label="restrict to individual spaces" onChange={this.onAllSpacesChange} />
                  : <EuiSpacer size="xl" />
                }
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );

    return (
      <Fragment>
        {buttonContent}
        {this.getSpaceSelector(rolePrivilege)}
        <EuiHorizontalRule />
      </Fragment>
    );
  }

  getSpaceSelector = (rolePrivilege) => {
    if (!rolePrivilege) {
      return null;
    }

    const {
      resources
    } = rolePrivilege;

    const allSelected = resources[0] === ALL_SPACES_RESOURCE;

    return (
      <Fragment>
        {/* <EuiFormRow compressed>
          <EuiSwitch checked={!allSelected} label="restrict to individual spaces" onChange={this.onAllSpacesChange} />
        </EuiFormRow> */}
        {!allSelected &&
          <Fragment>
            <EuiSpacer />
            <EuiFormRow>
              <PrivilegeSpaceSelector spaces={this.props.spaces} selectedSpaceIds={resources} onChange={this.onSelectedSpacesChange} />
            </EuiFormRow>
          </Fragment>
        }
      </Fragment>
    );
  }

  onAllSpacesChange = (e) => {
    const {
      appPrivilege,
      rbacApplication,
    } = this.props;

    const rolePriv = createRolePrivilege(appPrivilege, rbacApplication, e.target.checked ? [] : [ALL_SPACES_RESOURCE]);

    this.props.onChange(rolePriv);
  }

  onSelectedSpacesChange = (selectedSpaceIds) => {
    const {
      appPrivilege,
      rbacApplication,
    } = this.props;

    const rolePriv = createRolePrivilege(appPrivilege, rbacApplication, selectedSpaceIds);

    this.props.onChange(rolePriv);
  }

  onPrivilegeToggle = (e) => {
    const {
      appPrivilege,
      rbacApplication,
    } = this.props;

    if (!e.target.checked) {
      this.props.onRemove(appPrivilege.name);
      return;
    }

    const rolePriv = createRolePrivilege(appPrivilege, rbacApplication, [ALL_SPACES_RESOURCE]);

    this.props.onChange(rolePriv);
  }
}
