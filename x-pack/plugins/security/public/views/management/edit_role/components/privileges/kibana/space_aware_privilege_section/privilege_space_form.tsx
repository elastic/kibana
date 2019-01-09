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
  EuiSpacer,
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
import { copyRole } from '../../../../lib/copy_role';
import { FeatureTable } from '../feature_table';
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

export class PrivilegeSpaceForm extends Component<Props, State> {
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
        <EuiFlyout onClose={this.closeFlyout} size="m" maxWidth={true}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage id="foo" defaultMessage="Spaces privileges" />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{this.getForm()}</EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={this.closeFlyout} flush="left">
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={this.onSaveClick} fill disabled={!this.canSave()}>
                  Create space privilege
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
        <EuiFormRow fullWidth label={intl.formatMessage({ id: 'foo', defaultMessage: 'Spaces' })}>
          <SpaceSelector
            selectedSpaceIds={this.state.selectedSpaceIds}
            onChange={this.onSelectedSpacesChange}
            spaces={spaces}
          />
        </EuiFormRow>

        {this.getPrivilegeCallout()}

        <EuiFormRow
          fullWidth
          label={intl.formatMessage({ id: 'foo', defaultMessage: 'Privilege' })}
        >
          <EuiSuperSelect
            fullWidth
            onChange={this.onSpaceMinimumPrivilegeChange}
            options={[
              {
                value: 'custom',
                inputDisplay: <EuiText>Custom</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>Custom</strong>
                    <p>
                      Customize access by feature. Defaults to none for features not listed in the
                      table below.
                    </p>
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

        <EuiSpacer size="s" />

        <EuiTitle size="xxs">
          <h3>{this.getFeatureListLabel(this.state.selectedMinimumPrivilege.length > 0)}</h3>
        </EuiTitle>

        <EuiSpacer size="xs" />

        <EuiText size="s">
          <p>{this.getFeatureListDescription(this.state.selectedMinimumPrivilege.length > 0)}</p>
        </EuiText>

        <EuiSpacer size="l" />

        <FeatureTable
          role={this.state.role}
          features={this.props.features}
          effectivePrivileges={this.props.effectivePrivilegesFactory.getInstance(this.state.role)}
          intl={this.props.intl}
          onChange={this.onFeaturePrivilegesChange}
          privilegeDefinition={this.props.privilegeDefinition}
          spacesIndex={this.state.editingIndex}
          showLocks={this.state.selectedMinimumPrivilege.length === 0}
          disabled={this.state.selectedMinimumPrivilege.length > 0}
        />
      </EuiForm>
    );
  };

  private getFeatureListLabel = (disabled: boolean) => {
    if (disabled) {
      return this.props.intl.formatMessage({
        id: 'foo',
        defaultMessage: 'Summary of feature privileges',
      });
    } else {
      return this.props.intl.formatMessage({
        id: 'foo',
        defaultMessage: 'Customize by feature',
      });
    }
  };

  private getFeatureListDescription = (disabled: boolean) => {
    if (disabled) {
      return this.props.intl.formatMessage({
        id: 'foo',
        defaultMessage:
          'Showing privilege levels on a per-feature basis. Remember, some of these features may have been turned off by the space itself or affected by a global space privilege.',
      });
    } else {
      return this.props.intl.formatMessage({
        id: 'foo',
        defaultMessage:
          'Increase privilege levels from base privilege on a per-feature basis. Remember, some of these features may have been turned off by the space itself or affected by a global space privilege.',
      });
    }
  };

  private getPrivilegeCallout = () => {
    if (this.state.selectedSpaceIds.includes('*')) {
      return (
        <EuiFormRow fullWidth>
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
      selectedMinimumPrivilege: minimumPrivilege === 'custom' ? [] : [minimumPrivilege],
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
