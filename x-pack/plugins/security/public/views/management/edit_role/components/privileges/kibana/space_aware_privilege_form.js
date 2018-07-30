/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { PrivilegeSelector } from './privilege_selector';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSpacer,
  EuiButton,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import { isReservedRole } from '../../../../../../lib/role';
import { copyRole } from '../../../lib/copy_role';
import { getAvailablePrivileges } from '../../../lib/get_available_privileges';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { ALL_RESOURCE } from '../../../../../../../common/constants';
import { getKibanaPrivilegesViewModel } from '../../../lib/get_application_privileges';
import { PrivilegeCalloutWarning } from './privilege_callout_warning';

export class SpaceAwarePrivilegeForm extends Component {
  static propTypes = {
    kibanaAppPrivileges: PropTypes.array.isRequired,
    role: PropTypes.object.isRequired,
    spaces: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    editable: PropTypes.bool.isRequired,
  }

  constructor(props) {
    super(props);
    const {
      role,
      kibanaAppPrivileges,
    } = props;

    const { assignedPrivileges } = getKibanaPrivilegesViewModel(kibanaAppPrivileges, role.kibana);
    const spacePrivileges = {
      ...assignedPrivileges
    };
    delete spacePrivileges[ALL_RESOURCE];

    this.state = {
      spacePrivileges,
      privilegeForms: [],
    };
  }

  render() {
    const {
      kibanaAppPrivileges,
      role,
    } = this.props;

    const { availablePrivileges, assignedPrivileges } = getKibanaPrivilegesViewModel(kibanaAppPrivileges, role.kibana);

    const basePrivilege = assignedPrivileges[ALL_RESOURCE].length > 0 ? assignedPrivileges[ALL_RESOURCE][0] : NO_PRIVILEGE_VALUE;

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={<p>Minimum privilege</p>}
          description={<p>Specifies the lowest permission level for all spaces.</p>}
        >
          <EuiFormRow hasEmptyLabelSpace>
            <PrivilegeSelector
              availablePrivileges={availablePrivileges}
              value={basePrivilege}
              disabled={isReservedRole(role)}
              allowNone={true}
              onChange={this.onKibanaBasePrivilegeChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />
        {this.renderSpacePrivileges(basePrivilege, availablePrivileges)}
      </Fragment>
    );
  }

  renderSpacePrivileges = (basePrivilege, availablePrivileges) => {
    if (basePrivilege === 'all') {
      return <PrivilegeCalloutWarning basePrivilege={basePrivilege} isReservedRole={isReservedRole(this.props.role)} />;
    }

    const {
      role,
      spaces,
    } = this.props;

    const {
      spacePrivileges
    } = this.state;

    const availableSpaces = this.getAvailableSpaces();

    return (
      <Fragment>
        <EuiTitle size={'xs'}><h3>Space privileges</h3></EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText size={'s'} color={'subdued'}>
          <p>
            Customize permission levels on a per space basis.
            If a space is not listed, its permissions will default to the minimum privilege specified above.
          </p>
        </EuiText>

        {
          basePrivilege === 'read'
          && (this.state.privilegeForms.length > 0 || Object.keys(this.state.spacePrivileges).length > 0)
          && <PrivilegeCalloutWarning basePrivilege={basePrivilege} isReservedRole={isReservedRole(this.props.role)} />
        }

        <EuiFormRow fullWidth>
          <div>
            <PrivilegeSpaceTable
              role={role}
              spaces={spaces}
              availablePrivileges={availablePrivileges}
              spacePrivileges={spacePrivileges}
              onChange={this.onExistingSpacePrivilegesChange}
            />

            {this.props.editable && (
              <Fragment>
                {this.state.privilegeForms.map((form, index) => this.getSpaceForm(form, index, basePrivilege))}
                {availableSpaces.length > 0 &&
                  <Fragment>
                    <EuiSpacer />
                    <EuiButton size={'s'} iconType={'plusInCircle'} onClick={this.addSpacePrivilege}>Add space privilege</EuiButton>
                  </Fragment>
                }
              </Fragment>
            )}
          </div>

        </EuiFormRow>
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

  getSpaceForm = (form, index, basePrivilege) => {

    const {
      spaces: selectedSpaceIds,
      privilege,
    } = form;

    const availableSpaces = this.getAvailableSpaces(index);

    const isFirst = index === 0;

    const startingElement = isFirst ? <EuiSpacer /> : <EuiHorizontalRule />;

    return (
      <Fragment>
        {startingElement}
        <PrivilegeSpaceForm
          key={index}
          availableSpaces={availableSpaces}
          selectedSpaceIds={selectedSpaceIds}
          availablePrivileges={getAvailablePrivileges(basePrivilege)}
          selectedPrivilege={privilege}
          onChange={this.onPrivilegeSpacePermissionChange(index)}
          onDelete={this.onPrivilegeSpacePermissionDelete(index)}
        />
      </Fragment>
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

    const role = copyRole(this.props.role);

    if (!selectedSpaceIds.length || !selectedPrivilege) {
      return;
    }

    selectedSpaceIds.forEach(spaceId => {
      role.kibana[spaceId] = [selectedPrivilege];
    });

    this.props.onChange(role);
  }

  onPrivilegeSpacePermissionDelete = (index) => () => {
    const updatedPrivileges = [...this.state.privilegeForms];
    const removedPrivilege = updatedPrivileges.splice(index, 1)[0];

    this.setState({
      privilegeForms: updatedPrivileges
    });

    const role = copyRole(this.props.role);

    removedPrivilege.spaces.forEach(spaceId => {
      delete role.kibana[spaceId];
    });

    this.props.onChange(role);
  }

  onExistingSpacePrivilegesChange = (assignedPrivileges) => {
    const role = copyRole(this.props.role);

    role.kibana = assignedPrivileges;

    this.setState({
      spacePrivileges: assignedPrivileges
    });

    this.props.onChange(role);
  }


  onKibanaBasePrivilegeChange = (privilege) => {
    const role = copyRole(this.props.role);

    // Remove base privilege value
    delete role.kibana[ALL_RESOURCE];

    if (privilege !== NO_PRIVILEGE_VALUE) {
      role.kibana[ALL_RESOURCE] = [privilege];
    }

    this.props.onChange(role);
  }

  onRemoveSpacePrivilege = (spaceId) => {
    const role = copyRole(this.props.role);

    role.kibana.forEach(({ resources }) => {
      const spacePrivilegeIndex = resources.indexOf(spaceId);
      if (spacePrivilegeIndex >= 0) {
        resources.splice(spacePrivilegeIndex, 1);
      }
    });

    this.props.onChange(role);
  }
}
