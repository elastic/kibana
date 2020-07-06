/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ButtonColor,
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
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  EuiErrorBoundary,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { Space } from '../../../../../../../../spaces/public';
import { Role, copyRole } from '../../../../../../../common/model';
import { SpaceSelector } from './space_selector';
import { FeatureTable } from '../feature_table';
import { CUSTOM_PRIVILEGE_VALUE } from '../constants';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { KibanaPrivileges } from '../../../../model';

interface Props {
  role: Role;
  kibanaPrivileges: KibanaPrivileges;
  spaces: Space[];
  privilegeIndex: number;
  canCustomizeSubFeaturePrivileges: boolean;
  onChange: (role: Role) => void;
  onCancel: () => void;
}

interface State {
  privilegeIndex: number;
  selectedSpaceIds: string[];
  selectedBasePrivilege: string[];
  role: Role;
  mode: 'create' | 'update';
  isCustomizingFeaturePrivileges: boolean;
  privilegeCalculator: PrivilegeFormCalculator;
}

export class PrivilegeSpaceForm extends Component<Props, State> {
  public static defaultProps = {
    privilegeIndex: -1,
  };

  constructor(props: Props) {
    super(props);

    const role = copyRole(props.role);

    let privilegeIndex = props.privilegeIndex;
    if (privilegeIndex < 0) {
      // create new form
      privilegeIndex =
        role.kibana.push({
          spaces: [],
          base: [],
          feature: {},
        }) - 1;
    }

    this.state = {
      role,
      privilegeIndex,
      selectedSpaceIds: [...role.kibana[privilegeIndex].spaces],
      selectedBasePrivilege: [...(role.kibana[privilegeIndex].base || [])],
      mode: props.privilegeIndex < 0 ? 'create' : 'update',
      isCustomizingFeaturePrivileges: false,
      privilegeCalculator: new PrivilegeFormCalculator(props.kibanaPrivileges, role),
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
                  defaultMessage="Space privileges"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiErrorBoundary>{this.getForm()}</EuiErrorBoundary>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            {this.state.privilegeCalculator.hasSupersededInheritedPrivileges(
              this.state.privilegeIndex
            ) && (
              <Fragment>
                <EuiCallOut
                  color="warning"
                  iconType="alert"
                  data-test-subj="spaceFormGlobalPermissionsSupersedeWarning"
                  title={
                    <FormattedMessage
                      id="xpack.security.management.editRole.spacePrivilegeForm.supersededWarningTitle"
                      defaultMessage="Superseded by global privileges"
                    />
                  }
                >
                  <FormattedMessage
                    id="xpack.security.management.editRole.spacePrivilegeForm.supersededWarning"
                    defaultMessage="Declared privileges are less permissive than configured global privileges. View the privilege summary to see effective privileges."
                  />
                </EuiCallOut>
                <EuiSpacer size="s" />
              </Fragment>
            )}
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={this.closeFlyout}
                  flush="left"
                  data-test-subj={'cancelSpacePrivilegeButton'}
                >
                  <FormattedMessage
                    id="xpack.security.management.editRole.spacePrivilegeForm.cancelButton"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{this.getSaveButton()}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiOverlayMask>
    );
  }

  private getForm = () => {
    const { spaces } = this.props;

    const hasSelectedSpaces = this.state.selectedSpaceIds.length > 0;

    return (
      <EuiForm>
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.security.management.editRole.spacePrivilegeForm.spaceSelectorFormLabel',
            {
              defaultMessage: 'Spaces',
            }
          )}
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
          label={i18n.translate(
            'xpack.security.management.editRole.spacePrivilegeForm.privilegeSelectorFormLabel',
            {
              defaultMessage: 'Privilege',
            }
          )}
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
                        defaultMessage="Customize access by feature in selected spaces."
                      />
                    </p>
                  </EuiText>
                ),
              },
              {
                value: 'basePrivilege_read',
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
                        defaultMessage="Grant read-only access to all features in selected spaces."
                      />
                    </p>
                  </EuiText>
                ),
              },
              {
                value: 'basePrivilege_all',
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
                        defaultMessage="Grant full access to all features in selected spaces."
                      />
                    </p>
                  </EuiText>
                ),
              },
            ]}
            hasDividers
            valueOfSelected={this.getDisplayedBasePrivilege()}
            disabled={!hasSelectedSpaces}
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
          privilegeCalculator={this.state.privilegeCalculator}
          onChange={this.onFeaturePrivilegesChange}
          onChangeAll={this.onChangeAllFeaturePrivileges}
          kibanaPrivileges={this.props.kibanaPrivileges}
          privilegeIndex={this.state.privilegeIndex}
          canCustomizeSubFeaturePrivileges={this.props.canCustomizeSubFeaturePrivileges}
          disabled={this.state.selectedBasePrivilege.length > 0 || !hasSelectedSpaces}
        />

        {this.requiresGlobalPrivilegeWarning() && (
          <Fragment>
            <EuiSpacer size="l" />
            <EuiCallOut
              color="warning"
              iconType="alert"
              data-test-subj="globalPrivilegeWarning"
              title={
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeForm.globalPrivilegeWarning"
                  defaultMessage="Creating a global privilege might impact your other space privileges."
                />
              }
            />
          </Fragment>
        )}
      </EuiForm>
    );
  };

  private getSaveButton = () => {
    const { mode } = this.state;
    const isGlobal = this.isDefiningGlobalPrivilege();
    let buttonText;
    switch (mode) {
      case 'create':
        if (isGlobal) {
          buttonText = (
            <FormattedMessage
              id="xpack.security.management.editRolespacePrivilegeForm.createGlobalPrivilegeButton"
              defaultMessage="Create global privilege"
            />
          );
        } else {
          buttonText = (
            <FormattedMessage
              id="xpack.security.management.editRolespacePrivilegeForm.createPrivilegeButton"
              defaultMessage="Create space privilege"
            />
          );
        }
        break;
      case 'update':
        if (isGlobal) {
          buttonText = (
            <FormattedMessage
              id="xpack.security.management.editRolespacePrivilegeForm.updateGlobalPrivilegeButton"
              defaultMessage="Update global privilege"
            />
          );
        } else {
          buttonText = (
            <FormattedMessage
              id="xpack.security.management.editRolespacePrivilegeForm.updatePrivilegeButton"
              defaultMessage="Update space privilege"
            />
          );
        }
        break;
      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }

    let buttonColor: ButtonColor = 'primary';
    if (this.requiresGlobalPrivilegeWarning()) {
      buttonColor = 'warning';
    }

    return (
      <EuiButton
        onClick={this.onSaveClick}
        fill
        disabled={!this.canSave()}
        color={buttonColor}
        data-test-subj={'createSpacePrivilegeButton'}
      >
        {buttonText}
      </EuiButton>
    );
  };

  private getFeatureListLabel = (disabled: boolean) => {
    if (disabled) {
      return i18n.translate(
        'xpack.security.management.editRole.spacePrivilegeForm.summaryOfFeaturePrivileges',
        {
          defaultMessage: 'Summary of feature privileges',
        }
      );
    } else {
      return i18n.translate(
        'xpack.security.management.editRole.spacePrivilegeForm.customizeFeaturePrivileges',
        {
          defaultMessage: 'Customize by feature',
        }
      );
    }
  };

  private getFeatureListDescription = (disabled: boolean) => {
    if (disabled) {
      return i18n.translate(
        'xpack.security.management.editRole.spacePrivilegeForm.featurePrivilegeSummaryDescription',
        {
          defaultMessage:
            'Some features might be hidden by the space or affected by a global space privilege.',
        }
      );
    } else {
      return i18n.translate(
        'xpack.security.management.editRole.spacePrivilegeForm.customizeFeaturePrivilegeDescription',
        {
          defaultMessage:
            'Increase privilege levels on a per feature basis. Some features might be hidden by the space or affected by a global space privilege.',
        }
      );
    }
  };

  private getPrivilegeCallout = () => {
    if (this.isDefiningGlobalPrivilege()) {
      return (
        <EuiFormRow fullWidth>
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            title={i18n.translate(
              'xpack.security.management.editRole.spacePrivilegeForm.globalPrivilegeNotice',
              {
                defaultMessage: 'These privileges will apply to all current and future spaces.',
              }
            )}
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
    const role = copyRole(this.state.role);

    const form = role.kibana[this.state.privilegeIndex];

    // remove any spaces that no longer exist
    if (!this.isDefiningGlobalPrivilege()) {
      form.spaces = form.spaces.filter((spaceId) =>
        this.props.spaces.find((space) => space.id === spaceId)
      );
    }

    this.props.onChange(role);
  };

  private onSelectedSpacesChange = (selectedSpaceIds: string[]) => {
    const role = copyRole(this.state.role);

    const form = role.kibana[this.state.privilegeIndex];
    form.spaces = [...selectedSpaceIds];

    this.setState({
      selectedSpaceIds,
      role,
      privilegeCalculator: new PrivilegeFormCalculator(this.props.kibanaPrivileges, role),
    });
  };

  private onSpaceBasePrivilegeChange = (basePrivilege: string) => {
    const role = copyRole(this.state.role);
    const form = role.kibana[this.state.privilegeIndex];

    const privilegeName = basePrivilege.split('basePrivilege_')[1];

    let isCustomizingFeaturePrivileges = false;

    if (privilegeName === CUSTOM_PRIVILEGE_VALUE) {
      form.base = [];
      isCustomizingFeaturePrivileges = true;
    } else {
      form.base = [privilegeName];
      form.feature = {};
    }

    this.setState({
      selectedBasePrivilege: privilegeName === CUSTOM_PRIVILEGE_VALUE ? [] : [privilegeName],
      role,
      isCustomizingFeaturePrivileges,
      privilegeCalculator: new PrivilegeFormCalculator(this.props.kibanaPrivileges, role),
    });
  };

  private getDisplayedBasePrivilege = () => {
    const basePrivilege = this.state.privilegeCalculator.getBasePrivilege(
      this.state.privilegeIndex
    );

    if (basePrivilege) {
      return `basePrivilege_${basePrivilege.id}`;
    }

    return `basePrivilege_${CUSTOM_PRIVILEGE_VALUE}`;
  };

  private onFeaturePrivilegesChange = (featureId: string, privileges: string[]) => {
    const role = copyRole(this.state.role);
    const form = role.kibana[this.state.privilegeIndex];

    if (privileges.length === 0) {
      delete form.feature[featureId];
    } else {
      form.feature[featureId] = [...privileges];
    }

    this.setState({
      role,
      privilegeCalculator: new PrivilegeFormCalculator(this.props.kibanaPrivileges, role),
    });
  };

  private onChangeAllFeaturePrivileges = (privileges: string[]) => {
    const role = copyRole(this.state.role);
    const entry = role.kibana[this.state.privilegeIndex];

    if (privileges.length === 0) {
      entry.feature = {};
    } else {
      this.props.kibanaPrivileges.getSecuredFeatures().forEach((feature) => {
        const nextFeaturePrivilege = feature
          .getPrimaryFeaturePrivileges()
          .find((pfp) => privileges.includes(pfp.id));
        if (nextFeaturePrivilege) {
          entry.feature[feature.id] = [nextFeaturePrivilege.id];
        }
      });
    }
    this.setState({
      role,
      privilegeCalculator: new PrivilegeFormCalculator(this.props.kibanaPrivileges, role),
    });
  };

  private canSave = () => {
    if (this.state.selectedSpaceIds.length === 0) {
      return false;
    }

    const form = this.state.role.kibana[this.state.privilegeIndex];
    if (form.base.length === 0 && Object.keys(form.feature).length === 0) {
      return false;
    }

    return true;
  };

  private isDefiningGlobalPrivilege = () => this.state.selectedSpaceIds.includes('*');

  private requiresGlobalPrivilegeWarning = () => {
    const hasOtherSpacePrivilegesDefined = this.props.role.kibana.length > 0;
    return (
      this.state.mode === 'create' &&
      this.isDefiningGlobalPrivilege() &&
      hasOtherSpacePrivilegesDefined
    );
  };
}
