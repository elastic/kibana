/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiButtonGroup,
  EuiCallOut,
  EuiForm,
  EuiFormRow,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  EffectivePrivileges,
  getEffectivePrivileges,
} from 'plugins/security/lib/get_effective_privileges';
import React, { Component, Fragment } from 'react';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { NO_PRIVILEGE_VALUE } from '../../../lib/constants';
import { copyRole } from '../../../lib/copy_role';
import { RoleValidator } from '../../../lib/validate_role';
import { FeatureTable } from './feature_table/feature_table';
import { SpaceSelector } from './space_selector';

interface Props {
  spaces: Space[];
  mode: 'create' | 'edit';
  spaceId?: string | null;
  hasCustomizedGlobalPrivileges: boolean;
  privilegeDefinition: PrivilegeDefinition;
  effectivePrivileges: EffectivePrivileges;
  onChange: (role: Role) => void;
  onDelete: () => void;
  validator: RoleValidator;
  disabled?: boolean;
  intl: InjectedIntl;
  features: Feature[];
  role: Role;
}

interface State {
  privilegeIndex: number;
  selectedSpaceIds: string[];
  selectedMinimumPrivilege: string[];
  role: Role;
  selectedScope: 'global' | 'space';
}

export class PrivilegeSpaceFormUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const selectedMinimumPrivilege = [];

    // if (props.spaceId) {
    //   const space = props.role.kibana.space[props.spaceId];
    //   selectedMinimumPrivilege.push(...space.minimum);
    // } else {
    selectedMinimumPrivilege.push(...props.role.kibana.global.minimum);
    // }

    const hasGlobalPrivileges =
      props.role.kibana.global.minimum.length > 0 ||
      Object.keys(props.role.kibana.global.feature).length > 0;

    this.state = {
      selectedSpaceIds: props.spaceId ? [props.spaceId] : [],
      privilegeIndex: -1,
      selectedMinimumPrivilege,
      role: copyRole(props.role),
      selectedScope: hasGlobalPrivileges ? 'space' : 'global',
    };
  }

  public render() {
    const { spaces, effectivePrivileges } = this.props;
    const { selectedScope } = this.state;
    const effectiveMinimumPrivilege = effectivePrivileges.grants.space.minimum || [];

    return (
      <EuiForm>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Privilege scope'} />
            </EuiText>
          }
        >
          <EuiButtonGroup
            name="scope"
            options={[
              {
                id: 'global',
                label: 'global',
              },
              {
                id: 'space',
                label: 'space',
              },
            ]}
            color={'primary'}
            type={'single'}
            idSelected={selectedScope}
            onChange={this.onPrivilegeScopeChange}
          />
        </EuiFormRow>
        {this.getPrivilegeScopeOptions()}
        {this.getPrivilegeAssignmentCallout()}
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Access'} />
            </EuiText>
          }
        >
          <EuiSuperSelect
            disabled={this.props.disabled}
            onChange={this.onSpaceMinimumPrivilegeChange}
            options={[
              {
                disabled:
                  selectedScope !== 'global' ||
                  effectiveMinimumPrivilege.length > 0 ||
                  this.props.hasCustomizedGlobalPrivileges,
                value: NO_PRIVILEGE_VALUE,
                inputDisplay: <EuiText>None</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>None</strong>
                    <p>Specify access to individual features</p>
                  </EuiText>
                ),
              },
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
                disabled:
                  selectedScope === 'space' &&
                  (!effectivePrivileges.allows.space.minimum.includes('read') ||
                    this.props.hasCustomizedGlobalPrivileges),
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
                disabled:
                  selectedScope === 'space' &&
                  !effectivePrivileges.allows.space.minimum.includes('all'),
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
            valueOfSelected={this.getDisplayedMinimumPrivilege(effectivePrivileges)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Feature privileges'} />
            </EuiText>
          }
        >
          {this.maybeGetFeatureTable()}
        </EuiFormRow>
      </EuiForm>
    );
  }

  public getPrivilegeScopeOptions = () => {
    if (this.state.selectedScope === 'global') {
      return (
        <EuiFormRow>
          <EuiText>
            <FormattedMessage id="foo" defaultMessage={'Privileges apply to all of Kibana.'} />
          </EuiText>
        </EuiFormRow>
      );
    } else {
      return (
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Spaces'} />
            </EuiText>
          }
        >
          <SpaceSelector
            spaces={this.props.spaces}
            selectedSpaceIds={this.state.selectedSpaceIds}
            onChange={this.onSelectedSpacesChange}
          />
        </EuiFormRow>
      );
    }
  };

  public getPrivilegeAssignmentCallout = () => {
    if (this.state.selectedScope !== 'space') {
      return null;
    }
    const effectiveSpacePrivs = this.props.effectivePrivileges.grants.space;
    const hasEffectivePrivileges =
      effectiveSpacePrivs.minimum.length > 0 || Object.keys(effectiveSpacePrivs.feature).length > 0;

    if (hasEffectivePrivileges) {
      return (
        <EuiFormRow>
          <EuiCallOut
            color={'primary'}
            iconType={'globe'}
            title={'Global privileges are also granting access. Some options might be unavailable.'}
          />
        </EuiFormRow>
      );
    }

    return null;
  };

  public getDisplayedMinimumPrivilege = (effectivePrivileges: EffectivePrivileges) => {
    const assignedMimimumPrivilege = this.state.selectedMinimumPrivilege || [];
    const effectiveMinimumPrivilege = effectivePrivileges.grants.space.minimum || [];

    if (this.props.hasCustomizedGlobalPrivileges) {
      return 'custom';
    }

    const actualMinimumPrivilege =
      assignedMimimumPrivilege.length > 0 ? assignedMimimumPrivilege : effectiveMinimumPrivilege;

    if (actualMinimumPrivilege[0]) {
      return actualMinimumPrivilege[0];
    }
    return this.state.selectedScope === 'global' ? NO_PRIVILEGE_VALUE : 'custom';
  };

  public maybeGetFeatureTable = () => {
    if (true || this.state.selectedScope === 'global' || this.state.selectedSpaceIds.length > 0) {
      return (
        <FeatureTable
          disabled={
            this.props.disabled ||
            this.getDisplayedMinimumPrivilege(this.props.effectivePrivileges) !== 'custom'
          }
          onChange={this.onFeaturesPrivilegesChange}
          features={this.props.features}
          privilegeDefinition={this.props.privilegeDefinition}
          effectivePrivileges={getEffectivePrivileges(
            this.props.privilegeDefinition,
            this.state.role,
            this.state.selectedSpaceIds[0]
          )}
          spaceId={this.state.selectedSpaceIds[0]}
          role={this.state.role}
          intl={this.props.intl}
        />
      );
    }
    return (
      <EuiForm>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Spaces'} />
            </EuiText>
          }
        >
          <SpaceSelector
            disabled={this.props.mode === 'edit'}
            spaces={spaces}
            selectedSpaceIds={this.state.selectedSpaceIds}
            onChange={this.onSelectedSpacesChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Base privilege'} />
            </EuiText>
          }
        >
          <EuiSuperSelect
            disabled={this.props.disabled}
            onChange={this.onSpaceMinimumPrivilegeChange}
            options={[
              {
                disabled:
                  effectiveMinimumPrivilege.length > 0 || this.props.hasCustomizedGlobalPrivileges,
                value: NO_PRIVILEGE_VALUE,
                inputDisplay: <EuiText>None</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>None</strong>
                    <p>Specify access to individual features</p>
                  </EuiText>
                ),
              },
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
                disabled:
                  !effectivePrivileges.allows.space.minimum.includes('read') ||
                  this.props.hasCustomizedGlobalPrivileges,
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
                disabled: !effectivePrivileges.allows.space.minimum.includes('all'),
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
            valueOfSelected={this.getDisplayedMinimumPrivilege(effectivePrivileges)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Feature privileges'} />
            </EuiText>
          }
        >
          {this.maybeGetFeatureTable()}
        </EuiFormRow>
      </EuiForm>
    );
  };

  public onSpaceMinimumPrivilegeChange = (minimumPrivilege: string) => {
    const role = copyRole(this.state.role);

    if (this.state.selectedScope === 'global') {
      if (minimumPrivilege === 'custom' || minimumPrivilege === NO_PRIVILEGE_VALUE) {
        role.kibana.global.minimum = [];
      } else {
        role.kibana.global.minimum = [minimumPrivilege];
      }

      this.setState({ role, selectedMinimumPrivilege: [minimumPrivilege] });
      this.props.onChange(role);
      return;
    }

    this.state.selectedSpaceIds.forEach(spaceId => {
      const spacePrivileges = role.kibana.space[spaceId] || { minimum: [], feature: {} };

      if (minimumPrivilege === 'custom' || minimumPrivilege === NO_PRIVILEGE_VALUE) {
        spacePrivileges.minimum = [];
      } else {
        spacePrivileges.minimum = [minimumPrivilege];
      }

      role.kibana.space[spaceId] = spacePrivileges;
    });

    this.setState({
      selectedMinimumPrivilege: [minimumPrivilege],
      role,
    });

    this.props.onChange(role);
  };

  public onFeaturesPrivilegesChange = (featureId: string, privileges: string[]) => {
    const role: Role = copyRole(this.state.role);

    if (this.state.selectedScope === 'global') {
      role.kibana.global.feature = {
        ...role.kibana.global.feature,
        [featureId]: [...privileges],
      };
      this.setState({ role });
      this.props.onChange(role);
      return;
    }

    this.state.selectedSpaceIds.forEach(spaceId => {
      if (!role.kibana.space[spaceId]) {
        role.kibana.space[spaceId] = {
          minimum: [...this.state.selectedMinimumPrivilege],
          feature: {
            [featureId]: [...privileges],
          },
        };
      } else {
        role.kibana.space[spaceId].feature = {
          ...role.kibana.space[spaceId].feature,
          [featureId]: [...privileges],
        };
      }
    });

    this.setState({ role });
    this.props.onChange(role);
  };

  public getDisplayedMinimumPrivilege(effectivePrivileges: EffectivePrivileges) {
    const assignedMimimumPrivilege = this.state.selectedMinimumPrivilege || [];
    const effectiveMinimumPrivilege = effectivePrivileges.grants.space.minimum || [];

    if (this.props.hasCustomizedGlobalPrivileges) {
      return 'custom';
    }

    const actualMinimumPrivilege =
      assignedMimimumPrivilege.length > 0 ? assignedMimimumPrivilege : effectiveMinimumPrivilege;

    return actualMinimumPrivilege[0] || NO_PRIVILEGE_VALUE;
  }

  public maybeGetFeatureTable() {
    if (this.state.selectedSpaceIds.length > 0) {
      return (
        <FeatureTable
          disabled={
            this.props.disabled ||
            this.getDisplayedMinimumPrivilege(this.props.effectivePrivileges) !== 'custom'
          }
          onChange={this.onFeaturesPrivilegesChange}
          features={this.props.features}
          privilegeDefinition={this.props.privilegeDefinition}
          effectivePrivileges={getEffectivePrivileges(
            this.props.privilegeDefinition,
            this.state.role,
            this.state.selectedSpaceIds[0]
          )}
          spaceId={this.state.selectedSpaceIds[0]}
          role={this.state.role}
          intl={this.props.intl}
        />
      );
    }
    return (
      <EuiCallOut
        size={'s'}
        color={'primary'}
        iconType={'iInCircle'}
        title={'Choose a space to customize feature privileges'}
      />
    );
  }

  public onSpaceMinimumPrivilegeChange = (minimumPrivilege: string) => {
    const role = copyRole(this.state.role);

    this.state.selectedSpaceIds.forEach(spaceId => {
      const spacePrivileges = role.kibana.space[spaceId] || { minimum: [], feature: {} };
      spacePrivileges.minimum = [minimumPrivilege];

      role.kibana.space[spaceId] = spacePrivileges;
    });

    this.setState({
      selectedMinimumPrivilege: [minimumPrivilege],
      role,
    });

    this.props.onChange(role);
  };

  public onFeaturesPrivilegesChange = (featureId: string, privileges: string[]) => {
    const role: Role = copyRole(this.state.role);

    this.state.selectedSpaceIds.forEach(spaceId => {
      if (!role.kibana.space[spaceId]) {
        role.kibana.space[spaceId] = {
          minimum: [...this.state.selectedMinimumPrivilege],
          feature: {
            [featureId]: [...privileges],
          },
        };
      } else {
        role.kibana.space[spaceId].feature = {
          ...role.kibana.space[spaceId].feature,
          [featureId]: [...privileges],
        };
      }
    });

    this.setState({ role });
    this.props.onChange(role);
  };

  public onSelectedSpacesChange = (selectedSpaceIds: string[]) => {
    const removedSpaces = _.difference(this.state.selectedSpaceIds, selectedSpaceIds);
    const addedSpaces = _.difference(selectedSpaceIds, this.state.selectedSpaceIds);

    const role = copyRole(this.state.role);

    // Reset spaces that are no longer being edited by this form
    removedSpaces.forEach(spaceId => {
      delete role.kibana.space[spaceId];
    });

    this.setState({
      selectedSpaceIds,
      role,
    });
    this.props.onChange(role);
  };

  private onPrivilegeScopeChange = (newSelectedScope: 'global' | 'space') => {
    this.setState({
      selectedScope: newSelectedScope,
      selectedMinimumPrivilege: [],
      selectedSpaceIds: [],
      role: this.props.role,
    });
    this.props.onChange(this.props.role);
  };
}

export const PrivilegeSpaceForm = injectI18n(PrivilegeSpaceFormUI);
