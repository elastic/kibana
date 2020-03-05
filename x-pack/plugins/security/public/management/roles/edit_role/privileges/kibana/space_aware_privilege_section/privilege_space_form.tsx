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
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { Space } from '../../../../../../../../spaces/public';
import { Feature } from '../../../../../../../../features/public';
import { KibanaPrivileges, Role, copyRole } from '../../../../../../../common/model';
import {
  AllowedPrivilege,
  KibanaPrivilegeCalculatorFactory,
  PrivilegeExplanation,
} from '../kibana_privilege_calculator';
import { hasAssignedFeaturePrivileges } from '../../../privilege_utils';
import { CUSTOM_PRIVILEGE_VALUE } from '../constants';
import { FeatureTable } from '../feature_table';
import { SpaceSelector } from './space_selector';

interface Props {
  role: Role;
  privilegeCalculatorFactory: KibanaPrivilegeCalculatorFactory;
  kibanaPrivileges: KibanaPrivileges;
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
  mode: 'create' | 'update';
  isCustomizingFeaturePrivileges: boolean;
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
      mode: props.editingIndex < 0 ? 'create' : 'update',
      isCustomizingFeaturePrivileges: false,
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
                  <FormattedMessage
                    id="xpack.security.management.editRolespacePrivilegeForm.cancelButton"
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
    const { intl, spaces, privilegeCalculatorFactory } = this.props;

    const privilegeCalculator = privilegeCalculatorFactory.getInstance(this.state.role);

    const calculatedPrivileges = privilegeCalculator.calculateEffectivePrivileges()[
      this.state.editingIndex
    ];
    const allowedPrivileges = privilegeCalculator.calculateAllowedPrivileges()[
      this.state.editingIndex
    ];

    const baseExplanation = calculatedPrivileges.base;

    const hasSelectedSpaces = this.state.selectedSpaceIds.length > 0;

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
            intl={this.props.intl}
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
                disabled: !this.canCustomizeFeaturePrivileges(baseExplanation, allowedPrivileges),
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
                disabled: !allowedPrivileges.base.privileges.includes('read'),
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
            valueOfSelected={this.getDisplayedBasePrivilege(allowedPrivileges, baseExplanation)}
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
          features={this.props.features}
          calculatedPrivileges={calculatedPrivileges}
          allowedPrivileges={allowedPrivileges}
          rankedFeaturePrivileges={privilegeCalculator.rankedFeaturePrivileges}
          onChange={this.onFeaturePrivilegesChange}
          onChangeAll={this.onChangeAllFeaturePrivileges}
          kibanaPrivileges={this.props.kibanaPrivileges}
          spacesIndex={this.state.editingIndex}
          disabled={this.state.selectedBasePrivilege.length > 0 || !hasSelectedSpaces}
        />

        {this.requiresGlobalPrivilegeWarning() && (
          <Fragment>
            <EuiSpacer size="l" />
            <EuiCallOut
              color="warning"
              iconType="alert"
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
          'Some features might be hidden by the space or affected by a global space privilege.',
      });
    } else {
      return this.props.intl.formatMessage({
        id:
          'xpack.security.management.editRole.spacePrivilegeForm.customizeFeaturePrivilegeDescription',
        defaultMessage:
          'Increase privilege levels on a per feature basis. Some features might be hidden by the space or affected by a global space privilege.',
      });
    }
  };

  private getPrivilegeCallout = () => {
    if (this.isDefiningGlobalPrivilege()) {
      return (
        <EuiFormRow fullWidth>
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            title={this.props.intl.formatMessage({
              id: 'xpack.security.management.editRole.spacePrivilegeForm.globalPrivilegeNotice',
              defaultMessage: 'These privileges will apply to all current and future spaces.',
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
    const role = copyRole(this.state.role);

    const form = role.kibana[this.state.editingIndex];

    // remove any spaces that no longer exist
    if (!this.isDefiningGlobalPrivilege()) {
      form.spaces = form.spaces.filter(spaceId =>
        this.props.spaces.find(space => space.id === spaceId)
      );
    }

    this.props.onChange(role);
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
    });
  };

  private getDisplayedBasePrivilege = (
    allowedPrivileges: AllowedPrivilege,
    explanation: PrivilegeExplanation
  ) => {
    let displayedBasePrivilege = explanation.actualPrivilege;

    if (this.canCustomizeFeaturePrivileges(explanation, allowedPrivileges)) {
      const form = this.state.role.kibana[this.state.editingIndex];

      if (
        hasAssignedFeaturePrivileges(form) ||
        form.base.length === 0 ||
        this.state.isCustomizingFeaturePrivileges
      ) {
        displayedBasePrivilege = CUSTOM_PRIVILEGE_VALUE;
      }
    }

    return displayedBasePrivilege ? `basePrivilege_${displayedBasePrivilege}` : undefined;
  };

  private canCustomizeFeaturePrivileges = (
    basePrivilegeExplanation: PrivilegeExplanation,
    allowedPrivileges: AllowedPrivilege
  ) => {
    if (basePrivilegeExplanation.isDirectlyAssigned) {
      return true;
    }

    const featureEntries = Object.values(allowedPrivileges.feature);
    return featureEntries.some(entry => {
      return entry != null && (entry.canUnassign || entry.privileges.length > 1);
    });
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

    const calculator = this.props.privilegeCalculatorFactory.getInstance(role);
    const allowedPrivs = calculator.calculateAllowedPrivileges();

    if (privileges.length === 0) {
      form.feature = {};
    } else {
      this.props.features.forEach(feature => {
        const allowedPrivilegesFeature = allowedPrivs[this.state.editingIndex].feature[feature.id];
        const canAssign =
          allowedPrivilegesFeature && allowedPrivilegesFeature.privileges.includes(privileges[0]);

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
