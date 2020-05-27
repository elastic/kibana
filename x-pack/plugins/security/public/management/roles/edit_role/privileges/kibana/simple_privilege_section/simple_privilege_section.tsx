/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiComboBox,
  EuiFormRow,
  EuiSuperSelect,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { Role, RoleKibanaPrivilege, copyRole } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { CUSTOM_PRIVILEGE_VALUE, NO_PRIVILEGE_VALUE } from '../constants';
import { FeatureTable } from '../feature_table';
import { UnsupportedSpacePrivilegesWarning } from './unsupported_space_privileges_warning';
import { KibanaPrivileges } from '../../../../model';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';

interface Props {
  role: Role;
  kibanaPrivileges: KibanaPrivileges;
  onChange: (role: Role) => void;
  editable: boolean;
  canCustomizeSubFeaturePrivileges: boolean;
}

interface State {
  isCustomizingGlobalPrivilege: boolean;
  globalPrivsIndex: number;
}

export class SimplePrivilegeSection extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const globalPrivs = this.locateGlobalPrivilege(props.role);
    const globalPrivsIndex = this.locateGlobalPrivilegeIndex(props.role);

    this.state = {
      isCustomizingGlobalPrivilege: Boolean(
        globalPrivs && Object.keys(globalPrivs.feature).length > 0
      ),
      globalPrivsIndex,
    };
  }
  public render() {
    const kibanaPrivilege = this.getDisplayedBasePrivilege();

    const reservedPrivileges = this.props.role.kibana[this.state.globalPrivsIndex]?._reserved ?? [];

    const title = (
      <FormattedMessage
        id="xpack.security.management.editRole.simplePrivilegeForm.kibanaPrivilegesTitle"
        defaultMessage="Kibana privileges"
      />
    );

    const description = (
      <p>
        <FormattedMessage
          id="xpack.security.management.editRole.simplePrivilegeForm.specifyPrivilegeForRoleDescription"
          defaultMessage="Specifies the Kibana privilege for this role."
        />
      </p>
    );

    return (
      <Fragment>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {description}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label={title}>
              {reservedPrivileges.length > 0 ? (
                <EuiComboBox
                  fullWidth
                  selectedOptions={reservedPrivileges.map((rp) => ({ label: rp }))}
                  isDisabled
                />
              ) : (
                <EuiSuperSelect
                  disabled={!this.props.editable}
                  onChange={this.onKibanaPrivilegeChange}
                  options={[
                    {
                      value: NO_PRIVILEGE_VALUE,
                      inputDisplay: (
                        <EuiText>
                          <FormattedMessage
                            id="xpack.security.management.editRole.simplePrivilegeForm.noPrivilegeInput"
                            defaultMessage="None"
                          />
                        </EuiText>
                      ),
                      dropdownDisplay: (
                        <EuiText>
                          <strong>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.noPrivilegeDropdown"
                              defaultMessage="None"
                            />
                          </strong>
                          <p>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.noPrivilegeDropdownDescription"
                              defaultMessage="No access to Kibana"
                            />
                          </p>
                        </EuiText>
                      ),
                    },
                    {
                      value: CUSTOM_PRIVILEGE_VALUE,
                      inputDisplay: (
                        <EuiText>
                          <FormattedMessage
                            id="xpack.security.management.editRole.simplePrivilegeForm.customPrivilegeInput"
                            defaultMessage="Custom"
                          />
                        </EuiText>
                      ),
                      dropdownDisplay: (
                        <EuiText>
                          <strong>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.customPrivilegeDropdown"
                              defaultMessage="Custom"
                            />
                          </strong>
                          <p>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.customPrivilegeDropdownDescription"
                              defaultMessage="Customize access to Kibana"
                            />
                          </p>
                        </EuiText>
                      ),
                    },
                    {
                      value: 'read',
                      inputDisplay: (
                        <EuiText>
                          <FormattedMessage
                            id="xpack.security.management.editRole.simplePrivilegeForm.readPrivilegeInput"
                            defaultMessage="Read"
                          />
                        </EuiText>
                      ),
                      dropdownDisplay: (
                        <EuiText>
                          <strong>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.readPrivilegeDropdown"
                              defaultMessage="Read"
                            />
                          </strong>
                          <p>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.readPrivilegeDropdownDescription"
                              defaultMessage="Grants read-only access to all of Kibana"
                            />
                          </p>
                        </EuiText>
                      ),
                    },
                    {
                      value: 'all',
                      inputDisplay: (
                        <EuiText>
                          <FormattedMessage
                            id="xpack.security.management.editRole.simplePrivilegeForm.allPrivilegeInput"
                            defaultMessage="All"
                          />
                        </EuiText>
                      ),
                      dropdownDisplay: (
                        <EuiText>
                          <strong>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.allPrivilegeDropdown"
                              defaultMessage="All"
                            />
                          </strong>
                          <p>
                            <FormattedMessage
                              id="xpack.security.management.editRole.simplePrivilegeForm.allPrivilegeDropdownDescription"
                              defaultMessage="Grants full access to all of Kibana"
                            />
                          </p>
                        </EuiText>
                      ),
                    },
                  ]}
                  hasDividers
                  valueOfSelected={kibanaPrivilege}
                />
              )}
            </EuiFormRow>
            {this.state.isCustomizingGlobalPrivilege && (
              <EuiFormRow fullWidth>
                <FeatureTable
                  role={this.props.role}
                  kibanaPrivileges={this.props.kibanaPrivileges}
                  privilegeCalculator={
                    new PrivilegeFormCalculator(this.props.kibanaPrivileges, this.props.role)
                  }
                  onChange={this.onFeaturePrivilegeChange}
                  onChangeAll={this.onChangeAllFeaturePrivileges}
                  privilegeIndex={this.props.role.kibana.findIndex((k) =>
                    isGlobalPrivilegeDefinition(k)
                  )}
                  canCustomizeSubFeaturePrivileges={this.props.canCustomizeSubFeaturePrivileges}
                />
              </EuiFormRow>
            )}
            {this.maybeRenderSpacePrivilegeWarning()}
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  public getDisplayedBasePrivilege = () => {
    if (this.state.isCustomizingGlobalPrivilege) {
      return CUSTOM_PRIVILEGE_VALUE;
    }

    const { role } = this.props;

    const form = this.locateGlobalPrivilege(role);

    return form && form.base.length > 0 ? form.base[0] : NO_PRIVILEGE_VALUE;
  };

  public onKibanaPrivilegeChange = (privilege: string) => {
    const role = copyRole(this.props.role);

    const form = this.locateGlobalPrivilege(role) || this.createGlobalPrivilegeEntry(role);

    if (privilege === NO_PRIVILEGE_VALUE) {
      // Remove global entry if no privilege value
      role.kibana = role.kibana.filter((entry) => !isGlobalPrivilegeDefinition(entry));
    } else if (privilege === CUSTOM_PRIVILEGE_VALUE) {
      // Remove base privilege if customizing feature privileges
      form.base = [];
    } else {
      form.base = [privilege];
      form.feature = {};
    }

    this.props.onChange(role);
    this.setState({
      isCustomizingGlobalPrivilege: privilege === CUSTOM_PRIVILEGE_VALUE,
      globalPrivsIndex: role.kibana.indexOf(form),
    });
  };

  public onFeaturePrivilegeChange = (featureId: string, privileges: string[]) => {
    const role = copyRole(this.props.role);
    const form = this.locateGlobalPrivilege(role) || this.createGlobalPrivilegeEntry(role);
    if (privileges.length > 0) {
      form.feature[featureId] = [...privileges];
    } else {
      delete form.feature[featureId];
    }
    this.props.onChange(role);
  };

  private onChangeAllFeaturePrivileges = (privileges: string[]) => {
    const role = copyRole(this.props.role);

    const form = this.locateGlobalPrivilege(role) || this.createGlobalPrivilegeEntry(role);
    if (privileges.length > 0) {
      this.props.kibanaPrivileges.getSecuredFeatures().forEach((feature) => {
        form.feature[feature.id] = [...privileges];
      });
    } else {
      form.feature = {};
    }
    this.props.onChange(role);
  };

  private maybeRenderSpacePrivilegeWarning = () => {
    const kibanaPrivileges = this.props.role.kibana;
    const hasSpacePrivileges = kibanaPrivileges.some(
      (privilege) => !isGlobalPrivilegeDefinition(privilege)
    );

    if (hasSpacePrivileges) {
      return (
        <EuiFormRow fullWidth>
          <UnsupportedSpacePrivilegesWarning />
        </EuiFormRow>
      );
    }
    return null;
  };

  private locateGlobalPrivilegeIndex = (role: Role) => {
    return role.kibana.findIndex((privileges) => isGlobalPrivilegeDefinition(privileges));
  };

  private locateGlobalPrivilege = (role: Role) => {
    const spacePrivileges = role.kibana;
    return spacePrivileges.find((privileges) => isGlobalPrivilegeDefinition(privileges));
  };

  private createGlobalPrivilegeEntry(role: Role): RoleKibanaPrivilege {
    const newEntry = {
      spaces: ['*'],
      base: [],
      feature: {},
    };

    role.kibana.push(newEntry);

    return newEntry;
  }
}
