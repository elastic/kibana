/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import type { Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Space, SpacesApiUi } from '@kbn/spaces-plugin/public';

import type { Role } from '../../../../../../../common/model';
import { isRoleReserved } from '../../../../../../../common/model';
import type { KibanaPrivileges } from '../../../../model';
import type { RoleValidator } from '../../../validate_role';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { PrivilegeSummary } from '../privilege_summary';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { PrivilegeSpaceTable } from './privilege_space_table';

interface Props {
  kibanaPrivileges: KibanaPrivileges;
  role: Role;
  spaces: Space[];
  onChange: (role: Role) => void;
  editable: boolean;
  canCustomizeSubFeaturePrivileges: boolean;
  validator: RoleValidator;
  uiCapabilities: Capabilities;
  spacesApiUi: SpacesApiUi;
}

interface State {
  role: Role | null;
  privilegeIndex: number;
  showSpacePrivilegeEditor: boolean;
  showPrivilegeMatrix: boolean;
}

export class SpaceAwarePrivilegeSection extends Component<Props, State> {
  private globalSpaceEntry: Space = {
    id: '*',
    name: i18n.translate(
      'xpack.security.management.editRole.spaceAwarePrivilegeForm.globalSpacesName',
      {
        defaultMessage: '* All Spaces',
      }
    ),
    color: '#D3DAE6',
    initials: '*',
    disabledFeatures: [],
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      showSpacePrivilegeEditor: false,
      showPrivilegeMatrix: false,
      role: null,
      privilegeIndex: -1,
    };
  }

  public render() {
    const { uiCapabilities } = this.props;

    if (!uiCapabilities.spaces.manage) {
      return (
        <EuiCallOut
          title={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRole.spaceAwarePrivilegeForm.insufficientPrivilegesDescription"
                defaultMessage="Insufficient Privileges"
              />
            </p>
          }
          iconType="alert"
          color="danger"
          data-test-subj="userCannotManageSpacesCallout"
        >
          <p>
            <FormattedMessage
              id="xpack.security.management.editRole.spaceAwarePrivilegeForm.howToViewAllAvailableSpacesDescription"
              defaultMessage="You are not authorized to view all available spaces."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.management.editRole.spaceAwarePrivilegeForm.ensureAccountHasAllPrivilegesGrantedDescription"
              defaultMessage="Please ensure your account has all privileges granted by the
              {kibanaAdmin} role, and try again."
              values={{
                kibanaAdmin: (
                  <strong>
                    <FormattedMessage
                      id="xpack.security.management.editRole.spaceAwarePrivilegeForm.kibanaAdminTitle"
                      defaultMessage="kibana_admin"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      );
    }

    return (
      <EuiErrorBoundary>
        <Fragment>
          {this.renderKibanaPrivileges()}
          {this.state.showSpacePrivilegeEditor && (
            <PrivilegeSpaceForm
              role={this.props.role}
              kibanaPrivileges={this.props.kibanaPrivileges}
              onChange={this.onSpacesPrivilegeChange}
              onCancel={this.onCancelEditPrivileges}
              spaces={this.getAvailableSpaces(this.state.privilegeIndex)}
              privilegeIndex={this.state.privilegeIndex}
              canCustomizeSubFeaturePrivileges={this.props.canCustomizeSubFeaturePrivileges}
            />
          )}
        </Fragment>
      </EuiErrorBoundary>
    );
  }

  private renderKibanaPrivileges = () => {
    const { role } = this.props;

    const spacePrivileges = role.kibana;

    const hasAnyPrivileges = spacePrivileges.length > 0;
    if (hasAnyPrivileges) {
      const table = (
        <PrivilegeSpaceTable
          role={this.props.role}
          displaySpaces={this.getDisplaySpaces()}
          privilegeCalculator={
            new PrivilegeFormCalculator(this.props.kibanaPrivileges, this.props.role)
          }
          onChange={this.props.onChange}
          onEdit={this.onEditSpacesPrivileges}
          disabled={!this.props.editable}
        />
      );

      return (
        <div>
          {table}
          {<EuiSpacer />}
          {this.getAvailablePrivilegeButtons(true)}
        </div>
      );
    }

    return (
      <EuiEmptyPrompt
        iconType="lock"
        title={
          <h2>
            <FormattedMessage
              id="xpack.security.management.editRole.spacePrivilegeSection.noAccessToKibanaTitle"
              defaultMessage="This role does not grant access to Kibana"
            />
          </h2>
        }
        titleSize={'s'}
        actions={this.getAvailablePrivilegeButtons(false)}
      />
    );
  };

  private getAvailablePrivilegeButtons = (hasPrivilegesAssigned: boolean) => {
    const hasAvailableSpaces = this.getAvailableSpaces().length > 0;

    // This shouldn't happen organically...
    if (!hasAvailableSpaces && !hasPrivilegesAssigned) {
      return null;
    }

    const addPrivilegeButton = (
      <EuiButton
        color="primary"
        onClick={this.addSpacePrivilege}
        iconType={'plusInCircle'}
        data-test-subj={'addSpacePrivilegeButton'}
        isDisabled={!hasAvailableSpaces || !this.props.editable}
      >
        <FormattedMessage
          id="xpack.security.management.editRole.spacePrivilegeSection.addSpacePrivilegeButton"
          defaultMessage="Add Kibana privilege"
        />
      </EuiButton>
    );

    if (!hasPrivilegesAssigned) {
      return addPrivilegeButton;
    }

    const viewMatrixButton = (
      <PrivilegeSummary
        role={this.props.role}
        spaces={this.getDisplaySpaces()}
        kibanaPrivileges={this.props.kibanaPrivileges}
        canCustomizeSubFeaturePrivileges={this.props.canCustomizeSubFeaturePrivileges}
        spacesApiUi={this.props.spacesApiUi}
      />
    );

    return (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{addPrivilegeButton}</EuiFlexItem>
        {hasPrivilegesAssigned && !isRoleReserved(this.props.role) && (
          <EuiFlexItem grow={false}>{viewMatrixButton}</EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  private getDisplaySpaces = () => {
    return [this.globalSpaceEntry, ...this.props.spaces];
  };

  private getAvailableSpaces = (includeSpacesFromPrivilegeIndex: number = -1) => {
    const spacesToExclude = _.uniq(
      _.flatten(
        this.props.role.kibana.map((entry, index) => {
          if (includeSpacesFromPrivilegeIndex === index) {
            return [];
          }
          return entry.spaces;
        })
      )
    );

    return this.getDisplaySpaces().filter(
      (displaySpace) => !spacesToExclude.includes(displaySpace.id)
    );
  };

  private addSpacePrivilege = () => {
    this.setState({
      showSpacePrivilegeEditor: true,
      privilegeIndex: -1,
    });
  };

  private onSpacesPrivilegeChange = (role: Role) => {
    this.setState({ showSpacePrivilegeEditor: false, privilegeIndex: -1 });
    this.props.onChange(role);
  };

  private onEditSpacesPrivileges = (privilegeIndex: number) => {
    this.setState({
      privilegeIndex,
      showSpacePrivilegeEditor: true,
    });
  };

  private onCancelEditPrivileges = () => {
    this.setState({ showSpacePrivilegeEditor: false });
  };
}
