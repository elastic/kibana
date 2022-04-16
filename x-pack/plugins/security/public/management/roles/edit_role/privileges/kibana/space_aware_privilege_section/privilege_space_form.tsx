/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ButtonColor } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Space } from '@kbn/spaces-plugin/public';

import { ALL_SPACES_ID } from '../../../../../../../common/constants';
import type { FeaturesPrivileges, Role } from '../../../../../../../common/model';
import { copyRole } from '../../../../../../../common/model';
import type { KibanaPrivileges } from '../../../../model';
import { CUSTOM_PRIVILEGE_VALUE } from '../constants';
import { FeatureTable } from '../feature_table';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { SpaceSelector } from './space_selector';

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
      <EuiFlyout
        onClose={this.closeFlyout}
        size="m"
        maxWidth={true}
        maskProps={{ headerZindexLocation: 'below' }}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.security.management.editRole.spacePrivilegeForm.modalTitle"
                defaultMessage="Kibana privileges"
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
          helpText={i18n.translate(
            'xpack.security.management.editRole.spacePrivilegeForm.spaceSelectorFormHelpText',
            {
              defaultMessage:
                'Select one or more Kibana spaces to which you wish to assign privileges.',
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
              defaultMessage: 'Privileges for all features',
            }
          )}
          helpText={i18n.translate(
            'xpack.security.management.editRole.spacePrivilegeForm.privilegeSelectorFormHelpText',
            {
              defaultMessage:
                'Assign the privilege level you wish to grant to all present and future features across this space.',
            }
          )}
        >
          <EuiButtonGroup
            name={`basePrivilegeButtonGroup`}
            data-test-subj={`basePrivilegeButtonGroup`}
            isFullWidth={true}
            color={'primary'}
            options={[
              {
                id: 'basePrivilege_all',
                label: 'All',
                ['data-test-subj']: 'basePrivilege_all',
              },
              {
                id: 'basePrivilege_read',
                label: 'Read',
                ['data-test-subj']: 'basePrivilege_read',
              },
              {
                id: 'basePrivilege_custom',
                label: 'Customize',
                ['data-test-subj']: 'basePrivilege_custom',
              },
            ]}
            idSelected={this.getDisplayedBasePrivilege()}
            isDisabled={!hasSelectedSpaces}
            onChange={this.onSpaceBasePrivilegeChange}
            legend={i18n.translate(
              'xpack.security.management.editRole.spacePrivilegeForm.basePrivilegeControlLegend',
              {
                defaultMessage: 'Privileges for all features',
              }
            )}
          />
        </EuiFormRow>

        <EuiSpacer />

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
          allSpacesSelected={this.state.selectedSpaceIds.includes(ALL_SPACES_ID)}
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
              defaultMessage="Add Kibana privilege"
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
    form.feature = this.resetRoleFeature(form.feature, selectedSpaceIds); // Remove any feature privilege(s) that cannot currently be selected

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

  private resetRoleFeature = (roleFeature: FeaturesPrivileges, selectedSpaceIds: string[]) => {
    const securedFeatures = this.props.kibanaPrivileges.getSecuredFeatures();
    return Object.entries(roleFeature).reduce((features, [featureId, privileges]) => {
      if (!Array.isArray(privileges)) {
        return features;
      }
      const securedFeature = securedFeatures.find((sf) => sf.id === featureId);
      const primaryFeaturePrivilege = securedFeature
        ?.getPrimaryFeaturePrivileges({ includeMinimalFeaturePrivileges: true })
        .find((pfp) => privileges.includes(pfp.id)) ?? { disabled: false, requireAllSpaces: false };
      const newFeaturePrivileges =
        primaryFeaturePrivilege?.disabled ||
        (primaryFeaturePrivilege?.requireAllSpaces && !selectedSpaceIds.includes(ALL_SPACES_ID))
          ? [] // The primary feature privilege cannot be selected; remove that and any selected sub-feature privileges, too
          : privileges;
      return {
        ...features,
        ...(newFeaturePrivileges.length && { [featureId]: newFeaturePrivileges }),
      };
    }, {});
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
    this.setRole(privileges, featureId);
  };

  private onChangeAllFeaturePrivileges = (privileges: string[]) => {
    this.setRole(privileges);
  };

  private setRole(privileges: string[], featureId?: string) {
    const role = copyRole(this.state.role);
    const entry = role.kibana[this.state.privilegeIndex];

    if (privileges.length === 0) {
      if (featureId) {
        delete entry.feature[featureId];
      } else {
        entry.feature = {};
      }
    } else {
      let securedFeaturesToSet = this.props.kibanaPrivileges.getSecuredFeatures();
      if (featureId) {
        securedFeaturesToSet = [securedFeaturesToSet.find((sf) => sf.id === featureId)!];
      }
      securedFeaturesToSet.forEach((feature) => {
        const nextFeaturePrivilege = feature
          .getPrimaryFeaturePrivileges({ includeMinimalFeaturePrivileges: true })
          .find((pfp) => {
            if (
              pfp?.disabled ||
              (pfp?.requireAllSpaces && !this.state.selectedSpaceIds.includes(ALL_SPACES_ID))
            ) {
              return false;
            }
            return Array.isArray(privileges) && privileges.includes(pfp.id);
          });
        let newPrivileges: string[] = [];
        if (nextFeaturePrivilege) {
          newPrivileges = [nextFeaturePrivilege.id];
          feature.getSubFeaturePrivileges().forEach((psf) => {
            if (Array.isArray(privileges) && privileges.includes(psf.id)) {
              newPrivileges.push(psf.id);
            }
          });
        }
        if (newPrivileges.length === 0) {
          delete entry.feature[feature.id];
        } else {
          entry.feature[feature.id] = newPrivileges;
        }
      });
    }
    this.setState({
      role,
      privilegeCalculator: new PrivilegeFormCalculator(this.props.kibanaPrivileges, role),
    });
  }

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
