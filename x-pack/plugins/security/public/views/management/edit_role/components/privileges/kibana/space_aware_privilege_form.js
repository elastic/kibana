/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { getKibanaPrivileges } from '../../../lib/get_application_privileges';
import { denormalizePrivileges } from '../../../lib/privilege_transforms';
import { PrivilegeSelector } from './privilege_selector';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiInMemoryTable,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { isReservedRole } from '../../../../../../lib/role';
import { addPrivilegeToRole, setRolePrivilege, removePrivilegeFromRole } from '../../../lib/role_privilege';
import { SpaceAvatar } from '../../../../../../../../spaces/public/views/components/space_avatar';
import { copyRole } from '../../../lib/copy_role';

export class SpaceAwarePrivilegeForm extends Component {
  static propTypes = {
    kibanaAppPrivileges: PropTypes.array.isRequired,
    role: PropTypes.object.isRequired,
    rbacApplication: PropTypes.string.isRequired,
    spaces: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    editable: PropTypes.bool.isRequired,
  }

  constructor(props) {
    super(props);
    const {
      role,
      rbacApplication,
    } = props;


    const {
      spacePrivileges
    } = denormalizePrivileges(role, rbacApplication);

    this.state = {
      spacePrivileges,
      privilegeForms: [],
    };
  }

  render() {
    const {
      kibanaAppPrivileges,
      role,
      rbacApplication,
      spaces,
    } = this.props;

    const {
      spacePrivileges
    } = this.state;

    const kibanaPrivileges = getKibanaPrivileges(kibanaAppPrivileges, role, rbacApplication);

    const availableSpaces = this.getAvailableSpaces();

    const {
      basePrivilege = NO_PRIVILEGE_VALUE
    } = denormalizePrivileges(role, rbacApplication);

    const tableItems = Object.keys(spacePrivileges).map(spaceId => {
      return {
        space: spaces.find(s => s.id === spaceId),
        privilege: spacePrivileges[spaceId][0]
      };
    }).filter(item => !!item.space);

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={<p>Minimum privilege</p>}
          description={<p>Specifies the lowest permission level for all spaces.</p>}
        >
          <EuiFormRow hasEmptyLabelSpace>
            <PrivilegeSelector
              kibanaPrivileges={kibanaPrivileges}
              value={basePrivilege}
              disabled={isReservedRole(role)}
              onChange={this.onKibanaBasePrivilegeChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
        <EuiDescribedFormGroup
          title={<p>Space privileges</p>}
          description={
            <p>
              Customize permission levels on a per space basis.
              If a space is not listed, its permissions will default to the minimum privilege specified above.
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
                  name: 'Privilege',
                  render: (privilege) => {
                    return (
                      <PrivilegeSelector
                        kibanaPrivileges={kibanaPrivileges}
                        value={privilege}
                        disabled={isReservedRole(role)}
                        onChange={this.onEditSpacePermissionsClick}
                      />
                    );
                  }
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
                items={tableItems}
              />
              {this.props.editable && (
                <Fragment>
                  <EuiSpacer />
                  {this.state.privilegeForms.map((form, index) => this.getSpaceForm(form, index, kibanaPrivileges))}
                  {availableSpaces.length > 0 &&
                    <EuiButton size={'s'} iconType={'plusInCircle'} onClick={this.addSpacePrivilege}>Add space privilege</EuiButton>
                  }
                </Fragment>
              )}
            </div>
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </Fragment>
    );
  }

  addSpacePrivilege = () => {
    this.setState({
      privilegeForms: [...this.state.privilegeForms, {
        spaces: [],
        privilege: null
      }]
    });
  }

  getAvailableSpaces = (omitIndex) => {
    const {
      spacePrivileges
    } = this.state;

    return this.props.spaces.filter(space => {
      const alreadyAssigned = Object.keys(spacePrivileges).indexOf(space.id) >= 0;

      if (alreadyAssigned) {
        return false;
      }

      const otherForms = [...this.state.privilegeForms];
      if (typeof omitIndex === 'number') {
        otherForms.splice(omitIndex, 1);
      }

      const inAnotherForm = otherForms.some(({ spaces }) => spaces.indexOf(space.id) >= 0);

      return !inAnotherForm;
    });
  }

  getSpaceForm = ({ spaces: selectedSpaceIds, privilege }, index, kibanaPrivileges) => {

    const availableSpaces = this.getAvailableSpaces();

    return (
      <PrivilegeSpaceForm
        key={index}
        availableSpaces={availableSpaces}
        selectedSpaceIds={selectedSpaceIds}
        kibanaPrivileges={kibanaPrivileges}
        selectedPrivilege={privilege}
        onChange={this.onPrivilegeSpacePermissionChange(index)}
        onRemove={() => { }}
      />
    );
  }

  onPrivilegeSpacePermissionChange = (index) => ({ selectedSpaceIds, selectedPrivilege }) => {
    const updatedPrivileges = [...this.state.privilegeForms];
    updatedPrivileges[index] = {
      spaces: selectedSpaceIds,
      privilege: selectedPrivilege
    };

    this.setState({
      privilegeForms: updatedPrivileges
    });

    const {
      rbacApplication
    } = this.props;


    const role = copyRole(this.props.role);

    if (!selectedSpaceIds.length || !selectedPrivilege) {
      return;
    }

    addPrivilegeToRole(selectedPrivilege, role, rbacApplication, selectedSpaceIds);

    this.props.onChange(role);
  }


  onKibanaBasePrivilegeChange = (privilege) => {
    // TODO(legrego): This does not handle the "None" privilege. None should actually remove the privilege from the role.

    const role = copyRole(this.props.role);

    setRolePrivilege({
      application: this.props.rbacApplication,
      resources: ['*'],
      privileges: [privilege]
    }, role, this.props.rbacApplication);

    this.props.onChange(role);
  }

  onRemoveSpacePrivilege = (privilegeName) => {
    const role = copyRole(this.props.role);

    removePrivilegeFromRole(privilegeName, role, this.props.rbacApplication);

    this.props.onChange(role);
  }

  onKibanaSpacePrivilegeChange = (rolePrivilege) => {
    const role = copyRole(this.props.role);

    const {
      rbacApplication,
    } = this.props;

    setRolePrivilege(rolePrivilege, role, rbacApplication);

    this.props.onChange(role);
  };

  onEditSpacePermissionsClick = (permission) => {

    // do something.
    console.log('new permission', permission);
  }

  onDeleteSpacePermissionsClick = ({ space }) => {
    console.log('delete permissions for space', space);
  }
}
