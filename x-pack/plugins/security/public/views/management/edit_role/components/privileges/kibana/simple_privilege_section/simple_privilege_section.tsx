/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import { create } from 'domain';
import React, { Component, Fragment } from 'react';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { PrivilegeDefinition, Role } from '../../../../../../../../common/model';
import {
  CalculatedPrivilege,
  KibanaPrivilegeCalculatorFactory,
} from '../../../../../../../lib/kibana_privilege_calculator';
import { isGlobalPrivilegeDefinition } from '../../../../../../../lib/privilege_utils';
import { copyRole } from '../../../../../../../lib/role_utils';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';
import { FeatureTable } from '../feature_table';
import { UnsupportedSpacePrivilegesWarning } from './unsupported_space_privileges_warning';

interface Props {
  role: Role;
  privilegeDefinition: PrivilegeDefinition;
  privilegeCalculatorFactory: KibanaPrivilegeCalculatorFactory;
  features: Feature[];
  onChange: (role: Role) => void;
  editable: boolean;
  intl: InjectedIntl;
}

interface State {
  isCustomizingGlobalPrivilege: boolean;
  globalPrivsIndex: number;
}

export class SimplePrivilegeSection extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const globalPrivs = this.locateGlobalPrivilege(props.role, true);
    const globalPrivsIndex = this.locateGlobalPrivilegeIndex(props.role);

    this.state = {
      isCustomizingGlobalPrivilege: Object.keys(globalPrivs.feature).length > 0,
      globalPrivsIndex,
    };
  }
  public render() {
    const kibanaPrivilege = this.getDisplayedBasePrivilege();

    const privilegeCalculator = this.props.privilegeCalculatorFactory.getInstance(this.props.role);

    const calculatedPrivileges = privilegeCalculator.calculateEffectivePrivileges()[
      this.state.globalPrivsIndex
    ];

    const allowedPrivileges = privilegeCalculator.calculateAllowedPrivileges()[
      this.state.globalPrivsIndex
    ];

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
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRole.simplePrivilegeForm.kibanaPrivilegesTitle"
                defaultMessage="Kibana privileges"
              />
            </h3>
          }
          description={description}
        >
          <EuiFormRow hasEmptyLabelSpace>
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
                  value: 'custom',
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
          </EuiFormRow>
          {kibanaPrivilege === 'custom' && (
            <EuiFormRow>
              <FeatureTable
                role={this.props.role}
                privilegeDefinition={this.props.privilegeDefinition}
                calculatedPrivileges={calculatedPrivileges}
                allowedPrivileges={allowedPrivileges}
                rankedFeaturePrivileges={privilegeCalculator.rankedFeaturePrivileges}
                features={this.props.features}
                intl={this.props.intl}
                onChange={this.onFeaturePrivilegeChange}
                onChangeAll={this.onChangeAllFeaturePrivileges}
                spacesIndex={this.props.role.kibana.findIndex(k => isGlobalPrivilegeDefinition(k))}
              />
            </EuiFormRow>
          )}
          {this.maybeRenderSpacePrivilegeWarning()}
        </EuiDescribedFormGroup>
      </Fragment>
    );
  }

  public getDisplayedBasePrivilege = () => {
    if (this.state.isCustomizingGlobalPrivilege) {
      return 'custom';
    }

    const { role } = this.props;

    const form = this.locateGlobalPrivilege(role);

    return form.base.length > 0 ? form.base[0] : NO_PRIVILEGE_VALUE;
  };

  public onKibanaPrivilegeChange = (privilege: string) => {
    const role = copyRole(this.props.role);

    const form = this.locateGlobalPrivilege(role, true);

    // Remove base privilege value
    form.base = [];

    if (privilege !== NO_PRIVILEGE_VALUE && privilege !== 'custom') {
      form.base = [privilege];
    }

    if (privilege !== 'custom') {
      form.feature = {};
    }

    this.props.onChange(role);
    this.setState({
      isCustomizingGlobalPrivilege: privilege === 'custom',
    });
  };

  public onFeaturePrivilegeChange = (featureId: string, privileges: string[]) => {
    const role = copyRole(this.props.role);
    const form = this.locateGlobalPrivilege(role, true);
    if (privileges.length > 0) {
      form.feature[featureId] = [...privileges];
    } else {
      delete form.feature[featureId];
    }
    this.props.onChange(role);
  };

  private onChangeAllFeaturePrivileges = (privileges: string[]) => {
    const role = copyRole(this.props.role);

    const form = this.locateGlobalPrivilege(role, true);
    if (privileges.length > 0) {
      this.props.features.forEach(feature => {
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
      privilege => !isGlobalPrivilegeDefinition(privilege)
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

  private locateGlobalPrivilegeIndex = (role: Role, createIfMissing = false) => {
    const index = role.kibana.findIndex(privileges => isGlobalPrivilegeDefinition(privileges));

    if (index < 0 && createIfMissing) {
      const entry = this.createGlobalPrivilegeEntry(role);
      return role.kibana.indexOf(entry);
    }

    return index;
  };

  private locateGlobalPrivilege = (role: Role, createIfMissing = false) => {
    const spacePrivileges = role.kibana;
    const existing = spacePrivileges.find(privileges => isGlobalPrivilegeDefinition(privileges));
    if (existing) {
      return existing;
    }

    if (createIfMissing) {
      return this.createGlobalPrivilegeEntry(role);
    }

    return {
      spaces: ['*'],
      base: [],
      feature: {},
    };
  };

  private createGlobalPrivilegeEntry(role: Role) {
    const newEntry = {
      spaces: ['*'],
      base: [],
      feature: {},
    };

    role.kibana.push(newEntry);

    return newEntry;
  }
}
