/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  EuiTitle,
} from '@elastic/eui';
import { remove } from 'lodash';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { KibanaPrivileges } from '@kbn/security-role-management-model';
import {
  KibanaPrivilegeTable,
  PrivilegeFormCalculator,
  constants as UI_CONSTANTS,
} from '@kbn/security-ui-components';
import type { Space } from '@kbn/spaces-plugin/public';

import { SpaceSelector } from './space_selector';
import type { FeaturesPrivileges, Role } from '../../../../../../../common';
import { ALL_SPACES_ID } from '../../../../../../../common/constants';
import { copyRole } from '../../../../../../../common/model';

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
              {this.state.mode === 'create' ? (
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeForm.modalTitleCreate"
                  defaultMessage="Assign role to spaces"
                />
              ) : (
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeForm.modalTitleUpdate"
                  defaultMessage="Edit role privileges for spaces"
                />
              )}
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
                iconType="warning"
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
              defaultMessage: 'Select spaces',
            }
          )}
          helpText={i18n.translate(
            'xpack.security.management.editRole.spacePrivilegeForm.spaceSelectorFormHelpText',
            {
              defaultMessage: 'Users assigned to this role will gain access to selected spaces.',
            }
          )}
        >
          <SpaceSelector
            selectedSpaceIds={this.state.selectedSpaceIds}
            onChange={this.onSelectedSpacesChange}
            spaces={spaces}
          />
        </EuiFormRow>

        {Boolean(this.state.selectedSpaceIds.length) && (
          <>
            <EuiFormRow fullWidth>
              <EuiCallOut
                color="primary"
                iconType="iInCircle"
                size="s"
                title={i18n.translate(
                  'xpack.security.management.editRole.spacePrivilegeForm.privilegeCombinationMsg.title',
                  {
                    defaultMessage: `The user's resulting access depends on a combination of their role's global space privileges and specific privileges applied to this space.`,
                  }
                )}
              />
            </EuiFormRow>

            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.security.management.editRole.spacePrivilegeForm.privilegeSelectorFormLabel',
                {
                  defaultMessage: 'Define privileges',
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

            <KibanaPrivilegeTable
              role={this.state.role}
              privilegeCalculator={this.state.privilegeCalculator}
              onChange={this.onFeaturePrivilegesChange}
              onChangeAll={this.onChangeAllFeaturePrivileges}
              kibanaPrivileges={this.props.kibanaPrivileges}
              privilegeIndex={this.state.privilegeIndex}
              showAdditionalPermissionsMessage={true}
              canCustomizeSubFeaturePrivileges={this.props.canCustomizeSubFeaturePrivileges}
              disabled={this.state.selectedBasePrivilege.length > 0 || !hasSelectedSpaces}
              allSpacesSelected={this.state.selectedSpaceIds.includes(ALL_SPACES_ID)}
            />
          </>
        )}
      </EuiForm>
    );
  };

  private getSaveButton = () => {
    const { mode } = this.state;
    let buttonText;
    switch (mode) {
      case 'create':
        buttonText = (
          <FormattedMessage
            id="xpack.security.management.editRolespacePrivilegeForm.createPrivilegeButton"
            defaultMessage="Assign role"
          />
        );
        break;
      case 'update':
        buttonText = (
          <FormattedMessage
            id="xpack.security.management.editRolespacePrivilegeForm.updatePrivilegeButton"
            defaultMessage="Update role privileges"
          />
        );
        break;
      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }

    return (
      <EuiButton
        onClick={this.onSaveClick}
        fill
        disabled={!this.canSave()}
        color="primary"
        data-test-subj={'createSpacePrivilegeButton'}
      >
        {buttonText}
      </EuiButton>
    );
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

    if (privilegeName === UI_CONSTANTS.CUSTOM_PRIVILEGE_VALUE) {
      form.base = [];
      isCustomizingFeaturePrivileges = true;
    } else {
      form.base = [privilegeName];
      form.feature = {};
    }

    this.setState({
      selectedBasePrivilege:
        privilegeName === UI_CONSTANTS.CUSTOM_PRIVILEGE_VALUE ? [] : [privilegeName],
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

      const areAllSpacesSelected = selectedSpaceIds.includes(ALL_SPACES_ID);
      if (securedFeature) {
        securedFeature.getSubFeatures().forEach((subFeature) => {
          subFeature.privileges.forEach((currentPrivilege) => {
            if (privileges.includes(currentPrivilege.id)) {
              if (subFeature.requireAllSpaces && !areAllSpacesSelected) {
                remove(privileges, (privilege) => privilege === currentPrivilege.id);
              }
            }
          });
        });
      }
      const newFeaturePrivileges =
        primaryFeaturePrivilege?.disabled ||
        (primaryFeaturePrivilege?.requireAllSpaces && !areAllSpacesSelected)
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

    return `basePrivilege_${UI_CONSTANTS.CUSTOM_PRIVILEGE_VALUE}`;
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
              if (
                !psf.requireAllSpaces ||
                (psf.requireAllSpaces && this.state.selectedSpaceIds.includes(ALL_SPACES_ID))
              ) {
                newPrivileges.push(psf.id);
              }
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
    return !(form.base.length === 0 && Object.keys(form.feature).length === 0);
  };

  private isDefiningGlobalPrivilege = () => this.state.selectedSpaceIds.includes('*');
}
