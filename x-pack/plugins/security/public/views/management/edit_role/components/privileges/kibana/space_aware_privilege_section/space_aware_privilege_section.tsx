/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import _ from 'lodash';
import { EffectivePrivilegesFactory } from 'plugins/security/lib/effective_privileges';
import React, { Component, Fragment } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { Role } from '../../../../../../../../common/model/role';
import { RoleValidator } from '../../../../lib/validate_role';
import { PrivilegeMatrix } from './privilege_matrix';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { PrivilegeSpaceTable } from './privilege_space_table';

interface Props {
  privilegeDefinition: PrivilegeDefinition;
  role: Role;
  effectivePrivilegesFactory: EffectivePrivilegesFactory;
  spaces: Space[];
  onChange: (role: Role) => void;
  editable: boolean;
  validator: RoleValidator;
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
  features: Feature[];
}

interface State {
  role: Role | null;
  editingIndex: number;
  showSpacePrivilegeEditor: boolean;
  showPrivilegeMatrix: boolean;
}

class SpaceAwarePrivilegeSectionUI extends Component<Props, State> {
  private globalSpaceEntry: Space = {
    id: '*',
    name: '* Global (all spaces)',
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
      editingIndex: -1,
    };
  }

  public render() {
    const { uiCapabilities, effectivePrivilegesFactory } = this.props;

    if (!uiCapabilities.spaces.manage) {
      return (
        <EuiCallOut
          title={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.insufficientPrivilegesDescription"
                defaultMessage="Insufficient Privileges"
              />
            </p>
          }
          iconType="alert"
          color="danger"
        >
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.howToViewAllAvailableSpacesDescription"
              defaultMessage="You are not authorized to view all available spaces."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.ensureAccountHasAllPrivilegesGrantedDescription"
              defaultMessage="Please ensure your account has all privileges granted by the
              {kibanaUser} role, and try again."
              values={{
                kibanaUser: (
                  <strong>
                    <FormattedMessage
                      id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.kibanaUserTitle"
                      defaultMessage="kibana_user"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      );
    }

    let availableSpaces: Space[] = [];
    if (this.state.showSpacePrivilegeEditor) {
      availableSpaces = [...this.getAvailableSpaces()];
      if (this.state.editingIndex >= 0) {
        const form = this.props.role.kibana.spaces[this.state.editingIndex];

        const displaySpaces = this.getDisplaySpaces();
        const selectedSpaces = form.spaces
          .map(spaceId => displaySpaces.find(s => s.id === spaceId))
          .filter(Boolean) as Space[];

        availableSpaces.push(...selectedSpaces);
      }
    }

    return (
      <Fragment>
        {this.renderKibanaPrivileges()}
        {this.state.showSpacePrivilegeEditor && (
          <PrivilegeSpaceForm
            role={this.props.role}
            effectivePrivilegesFactory={effectivePrivilegesFactory}
            privilegeDefinition={this.props.privilegeDefinition}
            features={this.props.features}
            intl={this.props.intl}
            onChange={this.onSpacesPrivilegeChange}
            onCancel={this.onCancelEditPrivileges}
            spaces={availableSpaces}
            editingIndex={this.state.editingIndex}
          />
        )}
      </Fragment>
    );
  }

  private renderKibanaPrivileges = () => {
    const { role } = this.props;

    const { spaces } = role.kibana;

    const hasAnyPrivileges = spaces.length > 0;
    if (hasAnyPrivileges) {
      const table = (
        <PrivilegeSpaceTable
          role={this.props.role}
          displaySpaces={this.getDisplaySpaces()}
          effectivePrivilegesFactory={this.props.effectivePrivilegesFactory}
          onChange={this.props.onChange}
          onEdit={this.onEditSpacesPrivileges}
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
        title={<h2>No access to Kibana</h2>}
        titleSize={'s'}
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="foo"
                defaultMessage="This role does not grant any access to Kibana. Add privileges to existing spaces or groups of existing spaces using the button below."
              />
            </p>
          </Fragment>
        }
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
        iconType={'plusInCircleFilled'}
        data-test-subj={'addSpacePrivilegeButton'}
        isDisabled={!hasAvailableSpaces}
      >
        Add space privilege
      </EuiButton>
    );

    if (!hasPrivilegesAssigned) {
      return addPrivilegeButton;
    }

    const viewMatrixButton = (
      <PrivilegeMatrix
        role={this.props.role}
        effectivePrivileges={this.props.effectivePrivilegesFactory.getInstance(this.props.role)}
        features={this.props.features}
        spaces={this.getDisplaySpaces()}
      />
    );

    return (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{addPrivilegeButton}</EuiFlexItem>
        {hasPrivilegesAssigned && <EuiFlexItem grow={false}>{viewMatrixButton}</EuiFlexItem>}
      </EuiFlexGroup>
    );
  };

  private getDisplaySpaces = () => {
    return [this.globalSpaceEntry, ...this.props.spaces];
  };

  private getAvailableSpaces = () => {
    const { spaces: spacePrivileges } = this.props.role.kibana;

    const displaySpaces = this.getDisplaySpaces();

    const assignedSpaces: Space[] = _.uniq(_.flatten(spacePrivileges.map(entry => entry.spaces)))
      .map(spaceId => displaySpaces.find(s => s.id === spaceId))
      .filter(Boolean) as Space[];

    return _.difference([this.globalSpaceEntry, ...this.props.spaces], assignedSpaces) as Space[];
  };

  private addSpacePrivilege = () => {
    this.setState({
      showSpacePrivilegeEditor: true,
      editingIndex: -1,
    });
  };

  private onSpacesPrivilegeChange = (role: Role) => {
    this.setState({ showSpacePrivilegeEditor: false, editingIndex: -1 });
    this.props.onChange(role);
  };

  private onEditSpacesPrivileges = (spacesIndex: number) => {
    this.setState({
      editingIndex: spacesIndex,
      showSpacePrivilegeEditor: true,
    });
  };

  private onCancelEditPrivileges = () => {
    this.setState({ showSpacePrivilegeEditor: false });
  };
}

export const SpaceAwarePrivilegeSection = injectI18n(SpaceAwarePrivilegeSectionUI);
