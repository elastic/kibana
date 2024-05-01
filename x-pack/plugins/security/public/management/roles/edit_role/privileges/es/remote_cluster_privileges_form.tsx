/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Cluster } from '@kbn/remote-clusters-plugin/public';

import type { RoleRemoteClusterPrivilege } from '../../../../../../common';
import type { RoleValidator } from '../../validate_role';

const fromOption = (option: EuiComboBoxOptionOption) => option.label;
const toOption = (value: string): EuiComboBoxOptionOption => ({ label: value });

interface Props {
  formIndex: number;
  remoteClusterPrivilege: RoleRemoteClusterPrivilege;
  remoteClusters?: Cluster[];
  availableRemoteClusterPrivileges: string[];
  onChange: (remoteClusterPrivilege: RoleRemoteClusterPrivilege) => void;
  onDelete: () => void;
  isRoleReadOnly: boolean;
  validator: RoleValidator;
}

export class RemoteClusterPrivilegesForm extends Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  public componentDidMount() {}

  public render() {
    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" responsive={false} className="index-privilege-form">
          <EuiFlexItem>
            <EuiPanel color="subdued">{this.getPrivilegeForm()}</EuiPanel>
          </EuiFlexItem>
          {!this.props.isRoleReadOnly && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.security.management.editRole.remoteClusterPrivilegeForm.deleteRemoteClusterPrivilegeAriaLabel',
                  { defaultMessage: 'Delete remote cluster privilege' }
                )}
                color={'danger'}
                onClick={this.props.onDelete}
                iconType={'trash'}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </Fragment>
    );
  }

  private getPrivilegeForm = () => {
    const remoteClusterOptions: EuiComboBoxOptionOption[] = [];
    if (this.props.remoteClusters) {
      const incompatibleOptions: EuiComboBoxOptionOption[] = [];
      this.props.remoteClusters.forEach((item, i) => {
        const disabled = item.securityModel !== 'api_key';
        if (!disabled) {
          remoteClusterOptions.push({
            label: item.name,
          });
        } else {
          incompatibleOptions.push({
            label: item.name,
            disabled,
            append: disabled ? (
              <EuiIconTip
                type="warning"
                color="inherit"
                content={
                  <FormattedMessage
                    id="xpack.security.management.editRole.remoteClusterPrivilegeForm.remoteIndicesSecurityModelWarning"
                    defaultMessage="This cluster is configured with the certificate based security model and does not support remote index privileges. Connect this cluster with the API key based security model instead to use remote index privileges."
                  />
                }
              />
            ) : undefined,
          });
        }
      });
      if (incompatibleOptions.length) {
        remoteClusterOptions.push(
          {
            label: 'Incompatible clusters',
            isGroupLabelOption: true,
          },
          ...incompatibleOptions
        );
      }
    }

    return (
      <>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRole.remoteClusterPrivilegeForm.clustersFormRowLabel"
                  defaultMessage="Remote clusters"
                />
              }
              fullWidth
              {...this.props.validator.validateRemoteClusterPrivilegeClusterField(
                this.props.remoteClusterPrivilege as RoleRemoteClusterPrivilege
              )}
            >
              <EuiComboBox
                data-test-subj={`clustersInput${this.props.formIndex}`}
                options={remoteClusterOptions}
                selectedOptions={('clusters' in this.props.remoteClusterPrivilege &&
                this.props.remoteClusterPrivilege.clusters
                  ? this.props.remoteClusterPrivilege.clusters
                  : []
                ).map(toOption)}
                onCreateOption={this.onCreateClusterOption}
                onChange={this.onClustersChange}
                isDisabled={this.props.isRoleReadOnly}
                placeholder={i18n.translate(
                  'xpack.security.management.editRole.remoteClusterPrivilegeForm.clustersPlaceholder',
                  { defaultMessage: 'Add a remote cluster…' }
                )}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.security.management.editRole.remoteClusterPrivilegeForm.privilegesFormRowLabel"
                  defaultMessage="Privileges"
                />
              }
              fullWidth
              {...this.props.validator.validateRemoteClusterPrivilegePrivilegesField(
                this.props.remoteClusterPrivilege
              )}
            >
              <EuiComboBox
                data-test-subj={`privilegesInput${this.props.formIndex}`}
                options={this.props.availableRemoteClusterPrivileges.map(toOption)}
                selectedOptions={this.props.remoteClusterPrivilege.privileges.map(toOption)}
                onChange={this.onPrivilegeChange}
                onCreateOption={this.onCreateCustomPrivilege}
                isDisabled={this.props.isRoleReadOnly}
                placeholder={i18n.translate(
                  'xpack.security.management.editRole.remoteClusterPrivilegeForm.privilegesPlaceholder',
                  { defaultMessage: 'Add an action…' }
                )}
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };

  private onCreateClusterOption = (option: any) => {
    const nextClusters = (
      'clusters' in this.props.remoteClusterPrivilege && this.props.remoteClusterPrivilege.clusters
        ? this.props.remoteClusterPrivilege.clusters
        : []
    ).concat([option]);

    this.props.onChange({
      ...this.props.remoteClusterPrivilege,
      clusters: nextClusters,
    });
  };

  private onClustersChange = (nextOptions: EuiComboBoxOptionOption[]) => {
    const clusters = nextOptions.map(fromOption);
    this.props.onChange({
      ...this.props.remoteClusterPrivilege,
      clusters,
    });
  };

  private onPrivilegeChange = (newPrivileges: EuiComboBoxOptionOption[]) => {
    this.props.onChange({
      ...this.props.remoteClusterPrivilege,
      privileges: newPrivileges.map(fromOption),
    });
  };

  private onCreateCustomPrivilege = (customPrivilege: string) => {
    this.props.onChange({
      ...this.props.remoteClusterPrivilege,
      privileges: [...this.props.remoteClusterPrivilege.privileges, customPrivilege],
    });
  };
}
