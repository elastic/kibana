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
import React, { Component, Fragment } from 'react';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { PrivilegeDefinition, Role } from '../../../../../../../../common/model';
import { EffectivePrivileges } from '../../../../../../../lib/effective_privileges';
import { copyRole } from '../../../../../../../lib/role_utils';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';
import { FeatureTable } from '../feature_table';

interface Props {
  role: Role;
  privilegeDefinition: PrivilegeDefinition;
  effectivePrivileges: EffectivePrivileges;
  features: Feature[];
  onChange: (role: Role) => void;
  editable: boolean;
  intl: InjectedIntl;
}

export class SimplePrivilegeSection extends Component<Props, {}> {
  public render() {
    const { role } = this.props;

    const form = this.locateGlobalPrivilege(role);

    const kibanaPrivilege = form.base.length > 0 ? form.base[0] : NO_PRIVILEGE_VALUE;

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
                  inputDisplay: <EuiText>None</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>None</strong>
                      <p>No access to Kibana</p>
                    </EuiText>
                  ),
                },
                {
                  value: 'custom',
                  inputDisplay: <EuiText>Custom</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>Custom</strong>
                      <p>Customize access to Kibana</p>
                    </EuiText>
                  ),
                },
                {
                  value: 'read',
                  inputDisplay: <EuiText>Read</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>Read</strong>
                      <p>Grants read-only access to all of Kibana</p>
                    </EuiText>
                  ),
                },
                {
                  value: 'all',
                  inputDisplay: <EuiText>All</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>All</strong>
                      <p>Grants full access to Kibana</p>
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
                effectivePrivileges={this.props.effectivePrivileges}
                features={this.props.features}
                intl={this.props.intl}
                onChange={this.onFeaturePrivilegeChange}
                onChangeAll={this.onChangeAllFeaturePrivileges}
                spacesIndex={-1}
              />
            </EuiFormRow>
          )}
        </EuiDescribedFormGroup>
      </Fragment>
    );
  }

  public onKibanaPrivilegeChange = (privilege: string) => {
    const role = copyRole(this.props.role);

    const form = this.locateGlobalPrivilege(role, true);

    // Remove base privilege value
    form.base = [];

    if (privilege !== NO_PRIVILEGE_VALUE) {
      form.base = [privilege];
    }

    this.props.onChange(role);
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

  private locateGlobalPrivilege = (role: Role, createIfMissing = false) => {
    const spacePrivileges = role.kibana;
    const existing = spacePrivileges.find(privileges => privileges.spaces.includes('*'));
    if (existing) {
      return existing;
    }

    const newEntry = {
      spaces: ['*'],
      base: [],
      feature: {},
    };

    if (createIfMissing) {
      spacePrivileges.push(newEntry);
    }

    return newEntry;
  };
}
