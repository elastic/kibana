/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
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
import { EffectivePrivilegesFactory } from 'plugins/security/lib/effective_privileges';
import React, { Component } from 'react';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Space } from 'x-pack/plugins/spaces/common/model/space';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { copyRole } from '../../../lib/copy_role';
import { FeatureTable } from './feature_table/feature_table';
import { SpaceSelector } from './space_selector';

interface Props {
  role: Role;
  effectivePrivilegesFactory: EffectivePrivilegesFactory;
  privilegeDefinition: PrivilegeDefinition;
  features: Feature[];
  spaces: Space[];
  editingIndex: number;
  onChange: (role: Role) => void;
  onCancel: () => void;
  intl: InjectedIntl;
}

interface State {
  editingIndex: number;
  selectedSpaceIds: string[];
  selectedMinimumPrivilege: string[];
  role: Role;
}

export class NewPrivilegeSpaceForm extends Component<Props, State> {
  public static defaultProps = {
    editingIndex: -1,
  };

  constructor(props: Props) {
    super(props);

    const role = copyRole(props.role);

    let editingIndex = props.editingIndex;
    if (editingIndex < 0) {
      // create new form
      editingIndex =
        role.kibana.spaces.push({
          spaces: [],
          minimum: [],
          feature: {},
        }) - 1;
    }

    this.state = {
      role,
      editingIndex,
      selectedSpaceIds: [...role.kibana.spaces[editingIndex].spaces],
      selectedMinimumPrivilege: [...role.kibana.spaces[editingIndex].minimum],
    };
  }

  public render() {
    return (
      <EuiOverlayMask>
        <EuiFlyout onClose={this.closeFlyout} size="s" maxWidth={true}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h1>
                <FormattedMessage id="foo" defaultMessage="Spaces privileges" />
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
                <EuiButton onClick={this.onSaveClick} fill disabled={!this.canSave()}>
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
    const { intl, spaces } = this.props;
    return (
      <EuiForm>
        <EuiFormRow label={intl.formatMessage({ id: 'foo', defaultMessage: 'Spaces' })}>
          <SpaceSelector
            selectedSpaceIds={this.state.selectedSpaceIds}
            onChange={this.onSelectedSpacesChange}
            spaces={spaces}
          />
        </EuiFormRow>

        {this.getPrivilegeCallout()}

        <EuiFormRow
          label={intl.formatMessage({ id: 'foo', defaultMessage: 'Base privilege' })}
          helpText={intl.formatMessage({
            id: 'foo',
            defaultMessage:
              'Default privilege for apps and settings not listed in the table below.',
          })}
        >
          <EuiSuperSelect
            onChange={this.onSpaceMinimumPrivilegeChange}
            options={[
              {
                value: 'custom',
                inputDisplay: <EuiText>Custom</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>Custom</strong>
                    <p>Customize access to this space</p>
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
                    <p>Grants read-only access to all features in selected spaces</p>
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
                    <p>Grants full access to all features in selected spaces</p>
                  </EuiText>
                ),
              },
            ]}
            hasDividers
            valueOfSelected={this.getDisplayedMinimumPrivilege()}
          />
        </EuiFormRow>

        {this.state.selectedSpaceIds.length > 0 && (
          <EuiFormRow
            label={intl.formatMessage({ id: 'foo', defaultMessage: 'Customize by feature' })}
          >
            <FeatureTable
              role={this.state.role}
              features={this.props.features}
              effectivePrivileges={this.props.effectivePrivilegesFactory.getInstance(
                this.state.role
              )}
              intl={this.props.intl}
              onChange={this.onFeaturePrivilegesChange}
              privilegeDefinition={this.props.privilegeDefinition}
              spacesIndex={this.state.editingIndex}
            />
          </EuiFormRow>
        )}
      </EuiForm>
    );
  };

  private getPrivilegeCallout = () => {
    if (this.state.selectedSpaceIds.includes('*')) {
      return (
        <EuiFormRow>
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            title={'These privileges will apply to all current and future spaces'}
          />
        </EuiFormRow>
      );
    }

    return null;
  };

  private closeFlyout = () => {
    this.props.onCancel();
  };

  private onSaveClick = () => {
    this.props.onChange(this.state.role);
  };

  private onSelectedSpacesChange = (selectedSpaceIds: string[]) => {
    const role = copyRole(this.state.role);

    const form = role.kibana.spaces[this.state.editingIndex];
    form.spaces = [...selectedSpaceIds];

    this.setState({
      selectedSpaceIds,
      role,
    });
  };

  private onSpaceMinimumPrivilegeChange = (minimumPrivilege: string) => {
    const role = copyRole(this.state.role);
    const form = role.kibana.spaces[this.state.editingIndex];

    if (minimumPrivilege === 'custom') {
      form.minimum = [];
    } else {
      form.minimum = [minimumPrivilege];
    }

    this.setState({
      selectedMinimumPrivilege: [minimumPrivilege],
      role,
    });
  };

  private getDisplayedMinimumPrivilege = () => {
    const form = this.state.role.kibana.spaces[this.state.editingIndex];
    return form.minimum[0] || 'custom';
  };

  private onFeaturePrivilegesChange = (featureId: string, privileges: string[]) => {
    const role = copyRole(this.state.role);
    const form = role.kibana.spaces[this.state.editingIndex];

    if (privileges.length === 0) {
      delete form.feature[featureId];
    } else {
      form.feature[featureId] = [...privileges];
    }

    this.setState({
      role,
    });
  };

  private canSave = () => {
    if (this.state.selectedSpaceIds.length === 0) {
      return false;
    }

    const form = this.state.role.kibana.spaces[this.state.editingIndex];
    if (form.minimum.length === 0 && Object.keys(form.feature).length === 0) {
      return false;
    }

    return true;
  };
}
