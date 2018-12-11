/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiOverlayMask,
  EuiSpacer,
  // @ts-ignore
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { EffectivePrivileges } from 'plugins/security/lib/get_effective_privileges';
import React, { Component, Fragment } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { Role } from '../../../../../../../common/model/role';
import { isReservedRole } from '../../../../../../lib/role';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { copyRole } from '../../../lib/copy_role';
import { RoleValidator } from '../../../lib/validate_role';
import { FeatureTable } from './feature_table/feature_table';
import { ImpactedSpacesFlyout } from './impacted_spaces_flyout';
import { PrivilegeCalloutWarning } from './privilege_callout_warning';
import { PrivilegeSpaceForm } from './privilege_space_form';
import { PrivilegeSpaceTable } from './privilege_space_table';

interface Props {
  privilegeDefinition: PrivilegeDefinition;
  role: Role;
  effectivePrivileges: EffectivePrivileges;
  spaces: Space[];
  onChange: (role: Role) => void;
  editable: boolean;
  validator: RoleValidator;
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
  features: Feature[];
}

interface SpacePrivileges {
  [spaceId: string]: {
    minimum: string[];
    feature: {
      [featureId: string]: string[];
    };
  };
}

interface State {
  spacePrivileges: SpacePrivileges;
  role: Role | null;
  editingSpaceId: string | null;
  isCustomizingGlobalPrivileges: boolean;
  showGlobalFeatureTable: boolean;
  showSpacePrivilegeEditor: boolean;
}

class SpaceAwarePrivilegeFormUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const { role } = props;

    const assignedPrivileges = role.kibana;
    const spacePrivileges = {
      ...assignedPrivileges.space,
    };

    const hasCustomizedGlobalFeatures = Object.keys(role.kibana.global.feature).length > 0;

    this.state = {
      spacePrivileges,
      showGlobalFeatureTable: hasCustomizedGlobalFeatures,
      showSpacePrivilegeEditor: false,
      role: null,
      editingSpaceId: null,
      isCustomizingGlobalPrivileges: hasCustomizedGlobalFeatures,
    };
  }

  public render() {
    const { uiCapabilities, intl } = this.props;

    if (!uiCapabilities.spaces.manage) {
      return (
        <EuiCallOut
          title={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.insufficientPrivilegesDescription"
                defaultMessage="Insufficient Privileges"
              />
            </p>
          }
          iconType="alert"
          color="danger"
        >
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.howToViewAllAvailableSpacesDescription"
              defaultMessage="You are not authorized to view all available spaces."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.ensureAccountHasAllPrivilegesGrantedDescription"
              defaultMessage="Please ensure your account has all privileges granted by the
              {kibanaUser} role, and try again."
              values={{
                kibanaUser: (
                  <strong>
                    <FormattedMessage
                      id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.kibanaUserTitle"
                      defaultMessage="kibana_user"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      );
    }
    const basePrivilege = this.getDisplayedBasePrivilege();

    const description = (
      <p>
        <FormattedMessage
          id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.minimumActionsUserCanPerformInYourSpacesDescription"
          defaultMessage="Specify the minimum actions users can perform in your spaces."
        />
      </p>
    );

    let helptext;
    if (basePrivilege === NO_PRIVILEGE_VALUE) {
      helptext = intl.formatMessage({
        id: 'xpack.security.management.editRoles.spaceAwarePrivilegeForm.noAccessToSpacesHelpText',
        defaultMessage: 'No access to spaces',
      });
    } else if (basePrivilege === 'all') {
      helptext = intl.formatMessage({
        id:
          'xpack.security.management.editRoles.spaceAwarePrivilegeForm.viewEditShareAppsWithinAllSpacesHelpText',
        defaultMessage: 'View, edit, and share objects and apps within all spaces',
      });
    } else if (basePrivilege === 'read') {
      helptext = intl.formatMessage({
        id:
          'xpack.security.management.editRoles.spaceAwarePrivilegeForm.viewObjectsAndAppsWithinAllSpacesHelpText',
        defaultMessage: 'View objects and apps within all spaces',
      });
    }

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.minPrivilegesForAllSpacesTitle"
                defaultMessage="Minimum privileges for all spaces"
              />
            </h3>
          }
          description={description}
        >
          <EuiFormRow hasEmptyLabelSpace helpText={helptext}>
            <EuiSuperSelect
              disabled={!this.props.editable}
              onChange={this.onKibanaBasePrivilegeChange}
              options={[
                {
                  value: NO_PRIVILEGE_VALUE,
                  inputDisplay: <EuiText>None</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>None</strong>
                      <p>No access to Spaces</p>
                    </EuiText>
                  ),
                },
                {
                  value: 'custom',
                  inputDisplay: <EuiText>Custom</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>Custom</strong>
                      <p>Customize access to Kibana</p>
                    </EuiText>
                  ),
                },
                {
                  value: 'read',
                  inputDisplay: <EuiText>Read</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>Read</strong>
                      <p>Grants read-only access to all of Kibana</p>
                    </EuiText>
                  ),
                },
                {
                  value: 'all',
                  inputDisplay: <EuiText>All</EuiText>,
                  dropdownDisplay: (
                    <EuiText>
                      <strong>All</strong>
                      <p>Grants full access to Kibana</p>
                    </EuiText>
                  ),
                },
              ]}
              hasDividers
              valueOfSelected={basePrivilege}
            />
          </EuiFormRow>
          {this.state.isCustomizingGlobalPrivileges && (
            <Fragment>
              {/* <EuiFormRow label={'Control features for all spaces'}>
                <EuiSwitch
                  checked={this.state.showGlobalFeatureTable}
                  onChange={e => this.setState({ showGlobalFeatureTable: e.target.checked })}
                />
              </EuiFormRow>
              {this.state.showGlobalFeatureTable && ( */}
              <EuiFormRow>
                <FeatureTable
                  role={this.props.role}
                  features={this.props.features}
                  privilegeDefinition={this.props.privilegeDefinition}
                  effectivePrivileges={this.props.effectivePrivileges}
                  intl={this.props.intl}
                  onChange={this.onGlobalFeaturePrivilegesChange}
                />
              </EuiFormRow>
              {/* )} */}
            </Fragment>
          )}
        </EuiDescribedFormGroup>

        {this.renderSpacePrivileges(basePrivilege)}
      </Fragment>
    );
  }

  private getDisplayedBasePrivilege() {
    if (this.state.isCustomizingGlobalPrivileges) {
      return 'custom';
    }

    const assignedPrivileges = this.props.role.kibana;

    return assignedPrivileges.global.minimum.length > 0
      ? assignedPrivileges.global.minimum[0]
      : NO_PRIVILEGE_VALUE;
  }

  private renderSpacePrivileges = (basePrivilege: string) => {
    const { role, spaces } = this.props;

    const canAssignSpacePrivileges = basePrivilege !== 'all';
    const hasAssignedSpacePrivileges = Object.keys(this.state.spacePrivileges).length > 0;

    const unassignedSpaces = this.getUnassignedSpaces();
    const showAddPrivilegeButton = canAssignSpacePrivileges && unassignedSpaces.length > 0;

    return (
      <Fragment>
        <EuiTitle size={'xs'}>
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.higherPrivilegesForIndividualSpacesTitle"
              defaultMessage="Higher privileges for individual spaces"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText
          // @ts-ignore
          grow={false}
          size={'s'}
          color={'subdued'}
        >
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.grantMorePrivilegesTitle"
              defaultMessage="Grant more privileges on a per space basis. For example, if the privileges are
              {read} for all spaces, you can set the privileges to {all}
              for an individual space."
              values={{
                read: (
                  <strong>
                    <FormattedMessage
                      id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.readText"
                      defaultMessage="read"
                    />
                  </strong>
                ),
                all: (
                  <strong>
                    <FormattedMessage
                      id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.allText"
                      defaultMessage="all"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size={'s'} />
        {(basePrivilege !== NO_PRIVILEGE_VALUE || isReservedRole(this.props.role)) && (
          <PrivilegeCalloutWarning
            basePrivilege={basePrivilege}
            isReservedRole={isReservedRole(this.props.role)}
          />
        )}

        {canAssignSpacePrivileges && (
          <Fragment>
            <PrivilegeSpaceTable
              role={role}
              spaces={spaces}
              onEdit={this.onEditSpacePrivileges}
              onDelete={this.onDeleteSpacePrivileges}
            />

            {hasAssignedSpacePrivileges && <EuiSpacer />}

            {this.getSpaceForms(unassignedSpaces)}
          </Fragment>
        )}

        <EuiFlexGroup
          // @ts-ignore
          alignItems={'baseline'}
        >
          {showAddPrivilegeButton && (
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="addSpacePrivilegeButton"
                size={'s'}
                iconType={'plusInCircle'}
                onClick={this.addSpacePrivilege}
              >
                <FormattedMessage
                  id="xpack.security.management.editRoles.spaceAwarePrivilegeForm.addSpacePrivilegeTitle"
                  defaultMessage="Add space privilege"
                />
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ImpactedSpacesFlyout role={role} spaces={spaces} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  };

  private getSpaceForms = (unassignedSpaces: Space[]) => {
    if (!this.props.editable || !this.state.showSpacePrivilegeEditor) {
      return null;
    }

    const editing = Boolean(this.state.editingSpaceId);
    const title = editing ? `Edit space privilege` : `New space privilege`;

    return (
      <EuiOverlayMask>
        <EuiFlyout onClose={this.closeFlyout} size="s">
          <EuiFlyoutHeader>
            <EuiTitle>
              <h1>{title}</h1>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <PrivilegeSpaceForm
              mode={editing ? 'edit' : 'create'}
              hasCustomizedGlobalPrivileges={this.state.isCustomizingGlobalPrivileges}
              spaceId={this.state.editingSpaceId}
              spaces={editing ? this.props.spaces : unassignedSpaces}
              effectivePrivileges={this.props.effectivePrivileges}
              privilegeDefinition={this.props.privilegeDefinition}
              validator={this.props.validator}
              role={this.props.role}
              features={this.props.features}
              onChange={this.onPrivilegeSpaceFormChange}
              onDelete={() => null}
            />
          </EuiFlyoutBody>
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
  };

  private closeFlyout = () => {
    this.setState({
      showSpacePrivilegeEditor: false,
    });
  };

  private onEditSpacePrivileges = (spaceId: string) => {
    this.setState({
      showSpacePrivilegeEditor: true,
      editingSpaceId: spaceId,
      role: copyRole(this.props.role),
    });
  };

  private onDeleteSpacePrivileges = (spaceId: string) => {
    const role = copyRole(this.props.role);
    delete role.kibana.space[spaceId];
    this.props.onChange(role);
  };

  private onPrivilegeSpaceFormChange = (role: Role) => {
    this.setState({
      role,
    });
  };

  private onSaveClick = () => {
    if (this.state.role) {
      this.props.onChange(this.state.role);
    }
    this.setState({
      showSpacePrivilegeEditor: false,
    });
  };

  private addSpacePrivilege = () => {
    this.setState({
      editingSpaceId: null,
      showSpacePrivilegeEditor: true,
    });
  };

  private onKibanaBasePrivilegeChange = (privilege: string) => {
    const role = copyRole(this.props.role);

    // Remove base privilege value
    role.kibana.global.minimum = [];

    if (privilege !== NO_PRIVILEGE_VALUE && privilege !== 'custom') {
      role.kibana.global.minimum = [privilege];
    }

    this.setState({
      isCustomizingGlobalPrivileges: privilege === 'custom',
    });

    this.props.onChange(role);
  };

  private onGlobalFeaturePrivilegesChange = (featureId: string, privileges: string[]) => {
    const role = copyRole(this.props.role);
    role.kibana.global.feature[featureId] = [...privileges];
    this.props.onChange(role);
  };

  private getUnassignedSpaces() {
    const assignedSpaceIds = Object.keys(this.props.role.kibana.space);
    return this.props.spaces.filter(space => !assignedSpaceIds.includes(space.id));
  }
}

export const SpaceAwarePrivilegeForm = injectI18n(SpaceAwarePrivilegeFormUI);
