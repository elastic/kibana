/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { isReservedRole } from '../../../../../../lib/role';
import { getKibanaPrivileges } from '../../../lib/get_application_privileges';
import { setApplicationPrivileges } from '../../../lib/set_application_privileges';

import { CollapsiblePanel } from '../../collapsible_panel';
import {
  EuiSelect,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { removePrivilegeFromRole, setRolePrivilege } from '../../../lib/role_privilege';
import { SpaceAvatar } from '../../../../../../../../spaces/public/views/components/space_avatar';
import { denormalizePrivileges } from '../../../lib/privilege_transforms';

const noPrivilegeValue = '-none-';

export class KibanaPrivileges extends Component {
  static propTypes = {
    role: PropTypes.object.isRequired,
    spaces: PropTypes.array,
    spacesEnabled: PropTypes.bool.isRequired,
    editable: PropTypes.bool.isRequired,
    kibanaAppPrivileges: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  idPrefix = () => `${this.props.rbacApplication}_`;

  privilegeToId = (privilege) => `${this.idPrefix()}${privilege}`;

  idToPrivilege = (id) => id.split(this.idPrefix())[1];

  render() {
    return (
      <CollapsiblePanel iconType={'logoKibana'} title={'Kibana'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  getForm = () => {

    return this.getSpaceEnabledPrivilegeForm();

    const {
      spacesEnabled,
    } = this.props;

    let form;
    if (spacesEnabled) {
      form = this.getSpaceEnabledPrivilegeForm();
    } else {
      form = this.getStandardPrivilegeForm();
    }

    return (
      <EuiDescribedFormGroup
        title={<p>Application privileges</p>}
        description={<p>Manage the actions this role can perform within Kibana.</p>}
      >
        <EuiFormRow hasEmptyLabelSpace>
          {form}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  getSpaceEnabledPrivilegeForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication,
      spaces = [],
    } = this.props;

    const kibanaPrivileges = getKibanaPrivileges(kibanaAppPrivileges, role, rbacApplication);

    const options = [
      { value: noPrivilegeValue, text: 'none' },
      ...Object.keys(kibanaPrivileges).map(p => ({
        value: p,
        text: p
      }))
    ];

    const {
      basePrivilege = noPrivilegeValue,
      spacePrivileges
    } = denormalizePrivileges(role, rbacApplication);

    const otherItems = Object.keys(spacePrivileges).map(spaceId => {
      return {
        space: spaces.find(s => s.id === spaceId),
        privilege: spacePrivileges[spaceId][0]
      };
    });

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={<p>Base privilege</p>}
          description={<p>Specifies the default permissions for all spaces, unless otherwise specified below.</p>}
        >
          <EuiFormRow hasEmptyLabelSpace>
            <EuiSelect
              options={options}
              value={basePrivilege}
              onChange={this.onKibanaBasePrivilegeChange}
              disabled={isReservedRole(role)}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          title={<p>Space privileges</p>}
          description={
            <p>
              Customize permission levels on a per space basis.
              If a space is not listed, its permissions will default to the base privilege specified above.
            </p>
          }
        >
          <EuiFormRow>
            <div>
              <EuiInMemoryTable
                columns={[{
                  field: 'space',
                  name: 'Space',
                  width: '60%',
                  render: (space) => (
                    <EuiFlexGroup responsive={false} alignItems={'center'}>
                      <EuiFlexItem grow={false}><SpaceAvatar space={space} /></EuiFlexItem>
                      <EuiFlexItem><EuiText>{space.name}</EuiText></EuiFlexItem>
                    </EuiFlexGroup>
                  )
                }, {
                  field: 'privilege',
                  name: 'Privilege'
                }, {
                  name: 'Actions',
                  actions: [{
                    name: 'Edit',
                    description: 'Edit permissions for this space',
                    icon: 'pencil',
                    onClick: this.onEditSpacePermissionsClick
                  }, {
                    name: 'Delete',
                    description: 'Remove custom permissions for this space',
                    icon: 'trash',
                    onClick: this.onDeleteSpacePermissionsClick
                  }]
                }]}
                items={otherItems}
              />
              {this.props.editable && (
                <Fragment>
                  <EuiSpacer />
                  <EuiButton size={'s'} iconType={'plusInCircle'} onClick={this.addSpacePrivilege}>Add space privilege</EuiButton>
                </Fragment>
              )}
            </div>
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </Fragment>
    );
  }

  onEditSpacePermissionsClick = ({ space }) => {
    console.log('edit permissions for space', space);
  }

  onDeleteSpacePermissionsClick = ({ space }) => {
    console.log('delete permissions for space', space);
  }

  getStandardPrivilegeForm = () => {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication,
    } = this.props;

    const kibanaPrivileges = getKibanaPrivileges(kibanaAppPrivileges, role, rbacApplication);

    const options = [
      { value: noPrivilegeValue, text: 'none' },
      ...Object.keys(kibanaPrivileges).map(p => ({
        value: p,
        text: p
      }))
    ];

    const value = Object.keys(kibanaPrivileges).find(p => kibanaPrivileges[p].assigned) || noPrivilegeValue;

    return (
      <EuiDescribedFormGroup
        title={<p>Application privileges</p>}
        description={<p>Manage the actions this role can perform within Kibana.</p>}
      >
        <EuiFormRow hasEmptyLabelSpace>
          <EuiSelect
            options={options}
            value={value}
            onChange={this.onKibanaStandardPrivilegesChange}
            disabled={isReservedRole(role)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  onKibanaStandardPrivilegesChange = (e) => {
    const role = this._copyRole();
    const privilege = e.target.value;

    if (privilege === noPrivilegeValue) {
      // unsetting all privileges -- only necessary until RBAC Phase 3
      const noPrivileges = {};
      setApplicationPrivileges(noPrivileges, role, this.props.rbacApplication);
    } else {
      const newPrivileges = {
        [privilege]: true
      };
      setApplicationPrivileges(newPrivileges, role, this.props.rbacApplication);
    }

    this.props.onChange(role);
  }

  onKibanaBasePrivilegeChange = (e) => {
    // TODO(legrego): This does not handle the "None" privilege. None should actually remove the privilege from the role.

    const role = this._copyRole();
    const privilege = e.target.value;

    setRolePrivilege({
      application: this.props.rbacApplication,
      resources: ['*'],
      privileges: [privilege]
    }, role, this.props.rbacApplication);

    this.props.onChange(role);
  }

  onRemoveSpacePrivilege = (privilegeName) => {
    const role = this._copyRole();

    removePrivilegeFromRole(privilegeName, role, this.props.rbacApplication);

    this.props.onChange(role);
  }

  onKibanaSpacePrivilegeChange = (rolePrivilege) => {
    const role = this._copyRole();

    const {
      rbacApplication,
    } = this.props;

    setRolePrivilege(rolePrivilege, role, rbacApplication);

    this.props.onChange(role);
  };

  _copyRole = () => {
    const role = {
      ...this.props.role,
      applications: [...this.props.role.applications]
    };
    return role;
  }
}
