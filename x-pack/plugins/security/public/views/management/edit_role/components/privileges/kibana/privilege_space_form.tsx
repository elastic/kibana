/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiForm, EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import {
  EffectivePrivileges,
  getEffectivePrivileges,
} from 'plugins/security/lib/get_effective_privileges';
import React, { Component } from 'react';
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
  selectedSpaceIds: string[];
  selectedMinimumPrivilege: string[];
  role: Role;
}

export class PrivilegeSpaceFormUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const selectedMinimumPrivilege = [];

    if (props.spaceId) {
      const space = props.role.kibana.space[props.spaceId];
      selectedMinimumPrivilege.push(...space.minimum);
    } else {
      selectedMinimumPrivilege.push(...props.role.kibana.global.minimum);
    }

    this.state = {
      selectedSpaceIds: props.spaceId ? [props.spaceId] : [],
      selectedMinimumPrivilege,
      role: copyRole(props.role),
    };
  }

  public render() {
    const { spaces, effectivePrivileges } = this.props;

    const assignedMimimumPrivilege = this.state.selectedMinimumPrivilege || [];
    const effectiveMinimumPrivilege = effectivePrivileges.grants.space.minimum || [];

    const actualMinimumPrivilege =
      assignedMimimumPrivilege.length > 0 ? assignedMimimumPrivilege : effectiveMinimumPrivilege;

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
                disabled: effectiveMinimumPrivilege.length > 0,
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
                value: 'read',
                disabled: !effectivePrivileges.allows.space.minimum.includes('read'),
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
            valueOfSelected={actualMinimumPrivilege[0] || NO_PRIVILEGE_VALUE}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiText>
              <FormattedMessage id="foo" defaultMessage={'Feature privileges'} />
            </EuiText>
          }
        >
          <FeatureTable
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
        </EuiFormRow>
      </EuiForm>
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

    // Setup spaces that are being edited by this form
    addedSpaces.forEach(spaceId => {
      role.kibana.space[spaceId] = {
        minimum: [...this.state.selectedMinimumPrivilege],
        feature: {},
        // TODO: feature privs
      };
    });

    this.setState({
      selectedSpaceIds,
    });
    this.props.onChange(role);
  };
}

export const PrivilegeSpaceForm = injectI18n(PrivilegeSpaceFormUI);
