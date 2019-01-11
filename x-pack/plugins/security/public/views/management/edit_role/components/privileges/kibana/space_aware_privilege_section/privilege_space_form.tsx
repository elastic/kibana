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
import React, { Component } from 'react';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { PrivilegeDefinition } from '../../../../../../../../common/model/privileges/privilege_definition';
import { Role } from '../../../../../../../../common/model/role';
import { EffectivePrivilegesFactory } from '../../../../../../../lib/effective_privileges';
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
  selectedBasePrivilege: string[];
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
        role.kibana.push({
          spaces: [],
          base: [],
          feature: {},
        }) - 1;
    }

    this.state = {
      role,
      editingIndex,
      selectedSpaceIds: [...role.kibana[editingIndex].spaces],
      selectedBasePrivilege: [...(role.kibana[editingIndex].base || [])],
    };
  }

  public render() {
    return (
      <EuiOverlayMask>
        <EuiFlyout onClose={this.closeFlyout} size="m" maxWidth={true}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeForm.modalTitle"
                  defaultMessage="Spaces privileges"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{this.getForm()}</EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={this.closeFlyout}
                  flush="left"
                  data-test-subj={'cancelSpacePrivilegeButton'}
                >
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={this.onSaveClick}
                  fill
                  disabled={!this.canSave()}
                  data-test-subj={'createSpacePrivilegeButton'}
                >
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
        <EuiFormRow
          fullWidth
          label={intl.formatMessage({
            id: 'xpack.security.management.editRole.spacePrivilegeForm.spaceSelectorFormLabel',
            defaultMessage: 'Spaces',
          })}
        >
          <SpaceSelector
            selectedSpaceIds={this.state.selectedSpaceIds}
            onChange={this.onSelectedSpacesChange}
            spaces={spaces}
          />
        </EuiFormRow>

        {this.getPrivilegeCallout()}

        <EuiFormRow
          fullWidth
          label={intl.formatMessage({
            id: 'xpack.security.management.editRole.spacePrivilegeForm.privilegeSelectorFormLabel',
            defaultMessage: 'Privilege',
          })}
        >
          <EuiSuperSelect
            data-test-subj={'basePrivilegeComboBox'}
            fullWidth
            onChange={this.onSpaceBasePrivilegeChange}
            options={[
              {
                value: 'basePrivilege_custom',
                inputDisplay: (
                  <EuiText>
                    <FormattedMessage
                      id="xpack.security.management.editRole.spacePrivilegeForm.customPrivilegeDisplay"
                      defaultMessage="Custom"
                    />
                  </EuiText>
                ),
                dropdownDisplay: (
                  <EuiText>
                    <strong>
                      <FormattedMessage
                        id="xpack.security.management.editRole.spacePrivilegeForm.customPrivilegeDropdownDisplay"
                        defaultMessage="Custom"
                      />
                    </strong>
                    <p>
                      <FormattedMessage
                        id="xpack.security.management.editRole.spacePrivilegeForm.customPrivilegeDetails"
                        defaultMessage="Customize access by feature. Defaults to none for features not listed in the
                      table below."
                      />
                    </p>
                  </EuiText>
                ),
              },
              {
                value: 'basePrivilege_read',
                disabled: false,
                inputDisplay: (
                  <EuiText>
                    <FormattedMessage
                      id="xpack.security.management.editRole.spacePrivilegeForm.readPrivilegeDisplay"
                      defaultMessage="Read"
                    />
                  </EuiText>
                ),
                dropdownDisplay: (
                  <EuiText>
                    <strong>
                      <FormattedMessage
                        id="xpack.security.management.editRole.spacePrivilegeForm.readPrivilegeDropdownDisplay"
                        defaultMessage="Read"
                      />
                    </strong>
                    <p>
                      <FormattedMessage
                        id="xpack.security.management.editRole.spacePrivilegeForm.readPrivilegeDetails"
                        defaultMessage="Grants read-only access to all features in selected spaces"
                      />
                    </p>
                  </EuiText>
                ),
              },
              {
                value: 'basePrivilege_all',
                disabled: false,
                inputDisplay: (
                  <EuiText>
                    <FormattedMessage
                      id="xpack.security.management.editRole.spacePrivilegeForm.allPrivilegeDisplay"
                      defaultMessage="All"
                    />
                  </EuiText>
                ),
                dropdownDisplay: (
                  <EuiText>
                    <strong>
                      <FormattedMessage
                        id="xpack.security.management.editRole.spacePrivilegeForm.allPrivilegeDropdownDisplay"
                        defaultMessage="All"
                      />
                    </strong>
                    <p>
                      <FormattedMessage
                        id="xpack.security.management.editRole.spacePrivilegeForm.allPrivilegeDetails"
                        defaultMessage="Grants full access to all features in selected spaces"
                      />
                    </p>
                  </EuiText>
                ),
              },
            ]}
            hasDividers
            valueOfSelected={`basePrivilege_${this.getDisplayedBasePrivilege()}`}
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiTitle size="xxs">
          <h3>{this.getFeatureListLabel(this.state.selectedBasePrivilege.length > 0)}</h3>
        </EuiTitle>

        <EuiSpacer size="xs" />

        <EuiText size="s">
          <p>{this.getFeatureListDescription(this.state.selectedBasePrivilege.length > 0)}</p>
        </EuiText>

        <EuiSpacer size="l" />

        <FeatureTable
          role={this.state.role}
          features={this.props.features}
          effectivePrivileges={this.props.effectivePrivilegesFactory.getInstance(this.state.role)}
          intl={this.props.intl}
          onChange={this.onFeaturePrivilegesChange}
          onChangeAll={this.onChangeAllFeaturePrivileges}
          privilegeDefinition={this.props.privilegeDefinition}
          spacesIndex={this.state.editingIndex}
          disabled={this.state.selectedBasePrivilege.length > 0}
        />
      </EuiForm>
    );
  };

  private getFeatureListLabel = (disabled: boolean) => {
    if (disabled) {
      return this.props.intl.formatMessage({
        id: 'xpack.security.management.editRole.spacePrivilegeForm.summaryOfFeaturePrivileges',
        defaultMessage: 'Summary of feature privileges',
      });
    } else {
      return this.props.intl.formatMessage({
        id: 'xpack.security.management.editRole.spacePrivilegeForm.customizeFeaturePrivileges',
        defaultMessage: 'Customize by feature',
      });
    }
  };

  private getFeatureListDescription = (disabled: boolean) => {
    if (disabled) {
      return this.props.intl.formatMessage({
        id:
          'xpack.security.management.editRole.spacePrivilegeForm.featurePrivilegeSummaryDescription',
        defaultMessage:
          'Showing privilege levels on a per-feature basis. Remember, some of these features may have been turned off by the space itself or affected by a global space privilege.',
      });
    } else {
      return this.props.intl.formatMessage({
        id:
          'xpack.security.management.editRole.spacePrivilegeForm.customizeFeaturePrivilegeDescription',
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
            title={this.props.intl.formatMessage({
              id: 'xpack.security.management.editRole.spacePrivilegeForm.globalPrivilegeNotice',
              defaultMessage: 'These privileges will apply to all current and future spaces',
            })}
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

    const form = role.kibana[this.state.editingIndex];
    form.spaces = [...selectedSpaceIds];

    this.setState({
      selectedSpaceIds,
      role,
    });
  };

  private onSpaceBasePrivilegeChange = (basePrivilege: string) => {
    const role = copyRole(this.state.role);
    const form = role.kibana[this.state.editingIndex];

    const privilegeName = basePrivilege.split('basePrivilege_')[1];

    if (privilegeName === 'custom') {
      form.base = [];
    } else {
      form.base = [privilegeName];
      form.feature = {};
    }

    this.setState({
      selectedBasePrivilege: privilegeName === 'custom' ? [] : [privilegeName],
      role,
    });
  };

  private getDisplayedBasePrivilege = () => {
    const form = this.state.role.kibana[this.state.editingIndex];
    return form.base[0] || 'custom';
  };

  private onFeaturePrivilegesChange = (featureId: string, privileges: string[]) => {
    const role = copyRole(this.state.role);
    const form = role.kibana[this.state.editingIndex];

    if (privileges.length === 0) {
      delete form.feature[featureId];
    } else {
      form.feature[featureId] = [...privileges];
    }

    this.setState({
      role,
    });
  };

  private onChangeAllFeaturePrivileges = (privileges: string[]) => {
    const role = copyRole(this.state.role);
    const form = role.kibana[this.state.editingIndex];

    const effectivePrivileges = this.props.effectivePrivilegesFactory.getInstance(role);

    if (privileges.length === 0) {
      form.feature = {};
    } else {
      this.props.features.forEach(feature => {
        const canAssign = effectivePrivileges.canAssignSpaceFeaturePrivilege(
          feature.id,
          privileges[0],
          this.state.editingIndex
        );

        if (canAssign) {
          form.feature[feature.id] = [...privileges];
        }
      });
    }

    this.setState({
      role,
    });
  };

  private canSave = () => {
    if (this.state.selectedSpaceIds.length === 0) {
      return false;
    }

    const form = this.state.role.kibana[this.state.editingIndex];
    if (form.base.length === 0 && Object.keys(form.feature).length === 0) {
      return false;
    }

    return true;
  };
}
