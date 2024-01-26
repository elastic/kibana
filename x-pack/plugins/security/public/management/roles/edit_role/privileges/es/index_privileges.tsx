/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer } from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { IndexPrivilegeForm } from './index_privilege_form';
import type { Role, RoleIndexPrivilege, SecurityLicense } from '../../../../../../common';
import { isRoleEnabled, isRoleReadOnly } from '../../../../../../common/model';
import type { IndicesAPIClient } from '../../../indices_api_client';
import type { RoleValidator } from '../../validate_role';

interface Props {
  indexType: 'indices' | 'remote_indices';
  indexPatterns?: string[];
  remoteClusters?: Cluster[];
  role: Role;
  availableIndexPrivileges: string[];
  indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
  license: SecurityLicense;
  onChange: (role: Role) => void;
  validator: RoleValidator;
  editable?: boolean;
  isDarkMode?: boolean;
}

interface State {
  availableFields: {
    [indexPrivKey: string]: string[];
  };
}

export class IndexPrivileges extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    editable: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      availableFields: {},
    };
  }

  public render() {
    const indices = this.props.role.elasticsearch[this.props.indexType] ?? [];

    const {
      indexPatterns = [],
      remoteClusters,
      license,
      availableIndexPrivileges,
      indicesAPIClient,
    } = this.props;
    const {
      allowRoleDocumentLevelSecurity,
      allowRoleFieldLevelSecurity,
      allowRoleRemoteIndexPrivileges,
    } = license.getFeatures();

    const remoteIndexPrivilegesDisabled =
      this.props.indexType === 'remote_indices' && !allowRoleRemoteIndexPrivileges;

    const props = {
      indexType: this.props.indexType,
      indexPatterns,
      indicesAPIClient,
      // If editing an existing role while that has been disabled, always show the FLS/DLS fields because currently
      // a role is only marked as disabled if it has FLS/DLS setup (usually before the user changed to a license that
      // doesn't permit FLS/DLS).
      allowDocumentLevelSecurity: allowRoleDocumentLevelSecurity || !isRoleEnabled(this.props.role),
      allowFieldLevelSecurity: allowRoleFieldLevelSecurity || !isRoleEnabled(this.props.role),
      isRoleReadOnly:
        !this.props.editable || isRoleReadOnly(this.props.role) || remoteIndexPrivilegesDisabled,
    };

    return (
      <Fragment>
        {indices.map((indexPrivilege, i) => (
          <IndexPrivilegeForm
            key={i}
            {...props}
            formIndex={i}
            validator={this.props.validator}
            availableIndexPrivileges={availableIndexPrivileges}
            indexPrivilege={indexPrivilege}
            remoteClusters={remoteClusters}
            onChange={this.onIndexPrivilegeChange(i)}
            onDelete={this.onIndexPrivilegeDelete(i)}
            isDarkMode={this.props.isDarkMode}
          />
        ))}
        {this.props.editable && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="plusInCircle"
                  onClick={this.addIndexPrivilege}
                  disabled={remoteIndexPrivilegesDisabled}
                >
                  {this.props.indexType === 'remote_indices' ? (
                    <FormattedMessage
                      id="xpack.security.management.editRole.elasticSearchPrivileges.addRemoteIndexPrivilegesButtonLabel"
                      defaultMessage="Add remote index privilege"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.security.management.editRole.elasticSearchPrivileges.addIndexPrivilegesButtonLabel"
                      defaultMessage="Add index privilege"
                    />
                  )}
                </EuiButton>
              </EuiFlexItem>
              {remoteIndexPrivilegesDisabled && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.security.management.editRole.elasticSearchPrivileges.remoteIndexPrivilegesLicenseMissing"
                        defaultMessage="Your license does not allow configuring remote index privileges"
                      />
                    }
                    position="right"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}
      </Fragment>
    );
  }

  public addIndexPrivilege = () => {
    const { role, indexType } = this.props;
    const indices = role.elasticsearch[indexType] ?? [];

    const newIndices = [
      ...indices,
      {
        names: [],
        privileges: [],
        field_security: {
          grant: ['*'],
        },
      },
    ];

    this.props.onChange({
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        [indexType]: newIndices,
      },
    });
  };

  public onIndexPrivilegeChange = (privilegeIndex: number) => {
    return (updatedPrivilege: RoleIndexPrivilege) => {
      const { role, indexType } = this.props;
      const indices = role.elasticsearch[indexType] ?? [];

      const newIndices = [...indices];
      newIndices[privilegeIndex] = updatedPrivilege;

      this.props.onChange({
        ...this.props.role,
        elasticsearch: {
          ...this.props.role.elasticsearch,
          [indexType]: newIndices,
        },
      });
    };
  };

  public onIndexPrivilegeDelete = (privilegeIndex: number) => {
    return () => {
      const { role, indexType } = this.props;

      const indices = role.elasticsearch[indexType] ?? [];
      const newIndices = [...indices];
      newIndices.splice(privilegeIndex, 1);

      this.props.onChange({
        ...this.props.role,
        elasticsearch: {
          ...this.props.role.elasticsearch,
          [indexType]: newIndices,
        },
      });
    };
  };

  public isPlaceholderPrivilege = (indexPrivilege: RoleIndexPrivilege) => {
    return indexPrivilege.names.length === 0;
  };
}
