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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { isReservedRole } from '../../../../../../lib/role';
import { copyRole } from '../../../lib/copy_role';
import { getAvailablePrivileges } from '../../../lib/get_available_privileges';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { PrivilegeCalloutWarning } from './privilege_callout_warning';
import { ImpactedSpacesFlyout } from './impacted_spaces_flyout';

export class SpaceAwarePrivilegeForm extends Component {
  static propTypes = {
    kibanaAppPrivileges: PropTypes.array.isRequired,
    role: PropTypes.object.isRequired,
    spaces: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    editable: PropTypes.bool.isRequired,
    validator: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    const {
      role,
    } = props;

    const assignedPrivileges = role.kibana;
    const spacePrivileges = {
      ...assignedPrivileges.space
    };

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

    const assignedPrivileges = role.kibana;
    const availablePrivileges = kibanaAppPrivileges.map(privilege => privilege.name);

    const basePrivilege = assignedPrivileges.global.length > 0 ? assignedPrivileges.global[0] : NO_PRIVILEGE_VALUE;

    const description = (<p>Specifies the lowest permission level for all spaces, unless a custom privilege is specified.</p>);

    let helptext;
    if (basePrivilege === NO_PRIVILEGE_VALUE) {
      helptext = "No access";
    } else if (basePrivilege === 'all') {
      helptext = "View, edit, and share all objects and apps within all spaces";
    } else if (basePrivilege === 'read') {
      helptext = "View only mode";
    }

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={<h3>Minimum privilege</h3>}
          description={description}
        >
          <EuiFormRow
            hasEmptyLabelSpace
            helpText={helptext}
          >
            <PrivilegeSelector
              data-test-subj={'kibanaMinimumPrivilege'}
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
    const {
      role,
      spaces,
      kibanaAppPrivileges,
    } = this.props;

    const {
      spacePrivileges
    } = this.state;

    const availableSpaces = this.getAvailableSpaces();

    const canAssignSpacePrivileges = basePrivilege !== 'all';
    const hasAssignedSpacePrivileges = Object.keys(this.state.spacePrivileges).length > 0;

    const showAddPrivilegeButton = canAssignSpacePrivileges && this.props.editable && availableSpaces.length > 0;

    return (
      <Fragment>
        <EuiTitle size={'xs'}><h3>Space privileges</h3></EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText grow={false} size={'s'} color={'subdued'}>
          <p>
            Customize permission levels per space.
            If a space is not customized, its permissions will default to the minimum privilege specified above.
          </p>
          {basePrivilege !== 'all' && this.props.editable && (
            <p>You can bulk-create space privileges though they will be saved individually upon saving the role.</p>
          )}
        </EuiText>

        {(basePrivilege !== NO_PRIVILEGE_VALUE || isReservedRole(this.props.role)) &&
          <PrivilegeCalloutWarning
            role={this.props.role}
            spaces={this.props.spaces}
            spacePrivileges={spacePrivileges}
            basePrivilege={basePrivilege}
            isReservedRole={isReservedRole(this.props.role)}
          />
        }

        {basePrivilege === 'read' && this.props.editable && <EuiSpacer />}

        {canAssignSpacePrivileges && (
          <Fragment>
            <PrivilegeSpaceTable
              role={role}
              spaces={spaces}
              availablePrivileges={availablePrivileges}
              spacePrivileges={spacePrivileges}
              onChange={this.onExistingSpacePrivilegesChange}
            />

            {hasAssignedSpacePrivileges && <EuiSpacer />}

            {this.getSpaceForms(basePrivilege)}
          </Fragment>
        )}

        <EuiFlexGroup alignItems={'baseline'}>
          {showAddPrivilegeButton && (
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="addSpacePrivilegeButton"
                size={'s'}
                iconType={'plusInCircle'}
                onClick={this.addSpacePrivilege}
              >
                Add space privilege
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ImpactedSpacesFlyout
              role={role}
              spaces={spaces}
              kibanaAppPrivileges={kibanaAppPrivileges}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  getSpaceForms = (basePrivilege) => {
    if (!this.props.editable) {
      return null;
    }

    return this.state.privilegeForms.map((form, index) => this.getSpaceForm(form, index, basePrivilege));
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

    return (
      <Fragment key={index}>
        <PrivilegeSpaceForm
          key={index}
          availableSpaces={availableSpaces}
          selectedSpaceIds={selectedSpaceIds}
          availablePrivileges={getAvailablePrivileges(basePrivilege)}
          selectedPrivilege={privilege}
          onChange={this.onPrivilegeSpacePermissionChange(index)}
          onDelete={this.onPrivilegeSpacePermissionDelete(index)}
          validator={this.props.validator}
        />
        <EuiSpacer />
      </Fragment>
    );
  }

  onPrivilegeSpacePermissionChange = (index) => ({ selectedSpaceIds, selectedPrivilege }) => {
    const existingPrivilegeForm = { ...this.state.privilegeForms[index] };
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
      existingPrivilegeForm.spaces.forEach(spaceId => {
        role.kibana.space[spaceId] = [];
      });
    } else {
      selectedSpaceIds.forEach(spaceId => {
        role.kibana.space[spaceId] = [selectedPrivilege];
      });
    }

    this.props.validator.setInProgressSpacePrivileges(updatedPrivileges);
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

    role.kibana.space = assignedPrivileges;

    this.setState({
      spacePrivileges: assignedPrivileges
    });

    this.props.onChange(role);
  }


  onKibanaBasePrivilegeChange = (privilege) => {
    const role = copyRole(this.props.role);

    // Remove base privilege value
    role.kibana.global = [];

    if (privilege !== NO_PRIVILEGE_VALUE) {
      role.kibana.global = [privilege];
    }

    this.props.onChange(role);
  }
}
