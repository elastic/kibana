/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiOverlayMask,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import { EffectivePrivilegesFactory } from 'plugins/security/lib/effective_privileges_factory';
import React, { Component } from 'react';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { copyRole } from '../../../lib/copy_role';
import { FeatureTable } from './feature_table/feature_table';

interface Props {
  role: Role;
  privilegeDefinition: PrivilegeDefinition;
  effectivePrivilegesFactory: EffectivePrivilegesFactory;
  features: Feature[];
  onChange: (role: Role) => void;
  onCancel: () => void;
  intl: InjectedIntl;
}

interface State {
  selectedMinimumPrivilege: string[];
  role: Role;
}

export class NewPrivilegeGlobalForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const role = copyRole(props.role);

    this.state = {
      role,
      selectedMinimumPrivilege: [...role.kibana.global.minimum],
    };
  }

  public render() {
    return (
      <EuiOverlayMask>
        <EuiFlyout onClose={this.closeFlyout} size="s" maxWidth={true}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h1>
                <FormattedMessage id="fo" defaultMessage="Global Kibana privilege" />
              </h1>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{this.getForm()}</EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={this.closeFlyout} flush="left">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={this.onSaveClick} fill>
                  Save
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiOverlayMask>
    );
  }

  private getForm = () => {
    const { intl } = this.props;
    return (
      <EuiForm>
        <EuiFormRow>
          <EuiCallOut
            iconType={'iInCircle'}
            color={'primary'}
            title={intl.formatMessage({
              id: 'foo',
              defaultMessage:
                'These settings will apply to all current and future spaces and supercede any custom space privileges.',
            })}
          />
        </EuiFormRow>

        <EuiFormRow
          label={intl.formatMessage({ id: 'foo', defaultMessage: 'Base privilege' })}
          helpText={intl.formatMessage({
            id: 'foo',
            defaultMessage:
              'Default privilege for apps and settings not listed in the table below.',
          })}
        >
          <EuiSuperSelect
            onChange={this.onMinimumPrivilegeChange}
            options={[
              {
                value: 'custom',
                inputDisplay: <EuiText>Custom</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>Custom</strong>
                    <p>Customize access</p>
                  </EuiText>
                ),
              },
              {
                value: 'read',
                disabled: false,
                inputDisplay: <EuiText>Read</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>Read</strong>
                    <p>Grants read-only access to all features</p>
                  </EuiText>
                ),
              },
              {
                value: 'all',
                disabled: false,
                inputDisplay: <EuiText>All</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>All</strong>
                    <p>Grants full access to all features</p>
                  </EuiText>
                ),
              },
            ]}
            hasDividers
            valueOfSelected={this.getDisplayedMinimumPrivilege()}
          />
        </EuiFormRow>

        <EuiFormRow
          label={intl.formatMessage({ id: 'foo', defaultMessage: 'Customize by feature' })}
        >
          <FeatureTable
            role={this.state.role}
            features={this.props.features}
            effectivePrivileges={this.props.effectivePrivilegesFactory.getInstance(this.state.role)}
            intl={this.props.intl}
            onChange={this.onFeaturePrivilegesChange}
            privilegeDefinition={this.props.privilegeDefinition}
          />
        </EuiFormRow>
      </EuiForm>
    );
  };

  private closeFlyout = () => {
    this.props.onCancel();
  };

  private onSaveClick = () => {
    this.props.onChange(this.state.role);
  };

  private onMinimumPrivilegeChange = (minimumPrivilege: string) => {
    const role = copyRole(this.state.role);

    if (minimumPrivilege === 'custom') {
      role.kibana.global.minimum = [];
    } else {
      role.kibana.global.minimum = [minimumPrivilege];
    }

    this.setState({
      selectedMinimumPrivilege: [minimumPrivilege],
      role,
    });
  };

  private getDisplayedMinimumPrivilege = () => {
    return this.state.role.kibana.global.minimum[0] || 'custom';
  };

  private onFeaturePrivilegesChange = (featureId: string, privileges: string[]) => {
    const role = copyRole(this.state.role);
    const form = role.kibana.global;
    form.feature[featureId] = [...privileges];

    this.setState({
      role,
    });
  };
}
