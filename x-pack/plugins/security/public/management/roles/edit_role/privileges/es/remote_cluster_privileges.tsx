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

import { RemoteClusterPrivilegesForm } from './remote_cluster_privileges_form';
import type { Role, RoleRemoteClusterPrivilege, SecurityLicense } from '../../../../../../common';
import { isRoleReadOnly } from '../../../../../../common/model';
import type { RoleValidator } from '../../validate_role';

interface Props {
  remoteClusters?: Cluster[];
  role: Role;
  availableRemoteClusterPrivileges: string[];
  license: SecurityLicense;
  onChange: (role: Role) => void;
  validator: RoleValidator;
  editable?: boolean;
}

export class RemoteClusterPrivileges extends Component<Props> {
  static defaultProps: Partial<Props> = {
    editable: true,
  };

  constructor(props: Props) {
    super(props);
  }

  public render() {
    const remoteClusterPrivileges = this.props.role.elasticsearch.remote_cluster ?? [];
    const { remoteClusters, license, availableRemoteClusterPrivileges } = this.props;
    const { allowRoleRemoteIndexPrivileges, allowRemoteClusterPrivileges } = license.getFeatures();

    const remoteClusterPrivilegesDisabled = !allowRoleRemoteIndexPrivileges;

    const props = {
      isRoleReadOnly:
        !this.props.editable || isRoleReadOnly(this.props.role) || !allowRemoteClusterPrivileges,
    };

    return (
      <Fragment>
        {remoteClusterPrivileges.map((remoteClusterPrivilege, i) => (
          <RemoteClusterPrivilegesForm
            key={i}
            {...props}
            formIndex={i}
            validator={this.props.validator}
            availableRemoteClusterPrivileges={availableRemoteClusterPrivileges}
            remoteClusterPrivilege={remoteClusterPrivilege}
            remoteClusters={remoteClusters}
            onChange={this.onIndexPrivilegeChange(i)}
            onDelete={this.onIndexPrivilegeDelete(i)}
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
                  disabled={remoteClusterPrivilegesDisabled}
                >
                  <FormattedMessage
                    id="xpack.security.management.editRole.elasticSearchPrivileges.addRemoteClusterPrivilegesButtonLabel"
                    defaultMessage="Add remote cluster privilege"
                  />
                </EuiButton>
              </EuiFlexItem>
              {remoteClusterPrivilegesDisabled && (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.security.management.editRole.elasticSearchPrivileges.remoteClusterPrivilegesLicenseMissing"
                        defaultMessage="Your license does not allow configuring remote cluster privileges"
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
    const { role } = this.props;
    const remoteClusterPrivileges = role.elasticsearch.remote_cluster ?? [];

    const newRemoteClusterPrivileges = [
      ...remoteClusterPrivileges,
      {
        clusters: [],
        privileges: [],
      },
    ];

    this.props.onChange(this.getRoleDraft(newRemoteClusterPrivileges));
  };

  public onIndexPrivilegeChange = (privilegeIndex: number) => {
    return (updatedPrivilege: RoleRemoteClusterPrivilege) => {
      const { role } = this.props;
      const remoteClusterPrivileges = role.elasticsearch.remote_cluster ?? [];

      const newRemoteClusterPrivileges = [...remoteClusterPrivileges];
      newRemoteClusterPrivileges[privilegeIndex] = updatedPrivilege;

      this.props.onChange(this.getRoleDraft(newRemoteClusterPrivileges));
    };
  };

  public onIndexPrivilegeDelete = (privilegeIndex: number) => {
    return () => {
      const { role } = this.props;

      const remoteClusterPrivileges = role.elasticsearch.remote_cluster ?? [];
      const newRemoteClusterPrivileges = [...remoteClusterPrivileges];
      newRemoteClusterPrivileges.splice(privilegeIndex, 1);

      this.props.onChange(this.getRoleDraft(newRemoteClusterPrivileges));
    };
  };

  private getRoleDraft = (remoteCluster: RoleRemoteClusterPrivilege) => {
    return {
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        remote_cluster: remoteCluster,
      },
    };
  };
}
