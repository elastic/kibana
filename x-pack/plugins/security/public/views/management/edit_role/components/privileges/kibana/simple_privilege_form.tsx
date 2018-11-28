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
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { copyRole } from '../../../lib/copy_role';
import { FeatureTable } from './feature_table/feature_table';

interface Props {
  kibanaAppPrivileges: KibanaPrivilege[];
  role: Role;
  features: Feature[];
  onChange: (role: Role) => void;
  editable: boolean;
  intl: InjectedIntl;
}

export class SimplePrivilegeForm extends Component<Props, {}> {
  public render() {
    const { role } = this.props;

    const assignedPrivileges = role.kibana;

    const kibanaPrivilege: KibanaPrivilege =
      assignedPrivileges.global.length > 0
        ? (assignedPrivileges.global[0] as KibanaPrivilege)
        : NO_PRIVILEGE_VALUE;

    const description = (
      <p>
        <FormattedMessage
          id="xpack.security.management.editRoles.simplePrivilegeForm.specifyPrivilegeForRoleDescription"
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
                id="xpack.security.management.editRoles.simplePrivilegeForm.kibanaPrivilegesTitle"
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
                features={this.props.features}
                intl={this.props.intl}
                onChange={() => {
                  return;
                }}
              />
            </EuiFormRow>
          )}
        </EuiDescribedFormGroup>
      </Fragment>
    );
  }

  public onKibanaPrivilegeChange = (privilege: KibanaPrivilege) => {
    const role = copyRole(this.props.role);

    // Remove base privilege value
    role.kibana.global = [];

    if (privilege !== NO_PRIVILEGE_VALUE) {
      role.kibana.global = [privilege];
    }

    this.props.onChange(role);
  };
}
