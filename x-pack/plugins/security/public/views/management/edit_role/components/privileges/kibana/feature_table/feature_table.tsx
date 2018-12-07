/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiIcon,
  EuiIconTip,
  // @ts-ignore
  EuiInMemoryTable,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
  IconType,
} from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import { EffectivePrivileges } from 'plugins/security/lib/get_effective_privileges';
import React, { Component } from 'react';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';

interface Props {
  role: Role;
  features: Feature[];
  effectivePrivileges: EffectivePrivileges;
  privilegeDefinition: PrivilegeDefinition;
  intl: InjectedIntl;
  spaceId?: string;
  onChange: (featureId: string, privileges: string[]) => void;
}

interface ToolTipDefinition {
  privilegeId: string;
  tooltip: string;
}

export class FeatureTable extends Component<Props, {}> {
  public render() {
    const { role, features } = this.props;

    const items = features.map(feature => ({
      feature,
      role,
    }));

    return (
      <EuiInMemoryTable columns={this.getColumns(this.props.effectivePrivileges)} items={items} />
    );
  }

  public onChange = (featureId: string) => (privilege: string) => {
    this.props.onChange(featureId, [privilege]);
  };

  private getColumns = (effectivePrivileges: EffectivePrivileges) => [
    {
      field: 'feature',
      name: this.props.intl.formatMessage({
        id: 'xpack.roles.management.enabledRoleFeaturesFeatureColumnTitle',
        defaultMessage: 'Feature',
      }),
      render: (feature: Feature) => {
        const tooltips = Object.entries(feature.privileges).reduce(
          (acc: ToolTipDefinition[], [privilegeId, privilege]) => {
            if (!privilege.metadata || !privilege.metadata.tooltip) {
              return acc;
            }

            return [
              ...acc,
              {
                privilegeId,
                tooltip: privilege.metadata.tooltip,
              },
            ];
          },
          [] as ToolTipDefinition[]
        );

        let tooltipElement = null;
        if (tooltips.length > 0) {
          const tooltipContent = (
            <EuiText>
              {tooltips.map(tip => (
                <p key={tip.privilegeId}>{tip.tooltip}</p>
              ))}
            </EuiText>
          );
          tooltipElement = (
            <EuiIconTip type={'iInCircle'} color={'primary'} content={tooltipContent} />
          );
        }

        return (
          <EuiText>
            <EuiIcon type={feature.icon as IconType} />
            &ensp; {feature.name} {tooltipElement}
          </EuiText>
        );
      },
    },
    {
      field: 'role',
      align: 'right',
      name: this.props.intl.formatMessage({
        id: 'xpack.roles.management.enabledRoleFeaturesEnabledColumnTitle',
        defaultMessage: 'Privilege',
      }),
      render: (roleEntry: Role, record: Record<string, any>) => {
        const featurePrivileges = this.props.privilegeDefinition
          .getFeaturePrivileges()
          .getPrivileges(record.feature.id);

        if (!featurePrivileges) {
          // TODO
          return null;
        }

        const featureId = record.feature.id;

        const effectiveFeaturePrivileges = this.getEffectiveFeaturePrivileges(
          featureId,
          effectivePrivileges
        );

        const allowedFeaturePrivileges = this.getAllowedFeaturePrivileges(
          featureId,
          effectivePrivileges
        );

        const allowsNone = effectiveFeaturePrivileges.length === 0;

        const privilegeOptions = featurePrivileges.map(privilege => {
          const isEffectivePrivilege = effectiveFeaturePrivileges.includes(privilege);
          const isAllowedPrivilege = allowedFeaturePrivileges.includes(privilege);
          return {
            disabled: !isAllowedPrivilege,
            value: privilege,
            inputDisplay: <EuiText>{_.capitalize(privilege)}</EuiText>,
            dropdownDisplay: (
              <EuiText>
                <strong>{_.capitalize(privilege)}</strong>
              </EuiText>
            ),
          };
        });

        const assignedFeaturePrivileges = this.getAssignedFeaturePrivileges(featureId);

        const actualPrivilegeValue =
          assignedFeaturePrivileges.length === 0
            ? effectiveFeaturePrivileges
            : assignedFeaturePrivileges;

        return (
          <EuiSuperSelect
            compressed
            onChange={this.onChange(featureId)}
            options={[
              {
                disabled: !allowsNone,
                value: NO_PRIVILEGE_VALUE,
                inputDisplay: <EuiText>None</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>No privileges</strong>
                  </EuiText>
                ),
              },
              ...privilegeOptions,
            ]}
            hasDividers
            valueOfSelected={actualPrivilegeValue[0] || NO_PRIVILEGE_VALUE}
          />
        );
      },
    },
  ];

  private getEffectiveFeaturePrivileges(
    featureId: string,
    effectivePrivileges: EffectivePrivileges
  ): string[] {
    if (this.props.spaceId) {
      return effectivePrivileges.grants.space.feature[featureId] || [];
    }
    return effectivePrivileges.grants.global.feature[featureId] || [];
  }

  private getAllowedFeaturePrivileges(
    featureId: string,
    effectivePrivileges: EffectivePrivileges
  ): string[] {
    if (this.props.spaceId) {
      return effectivePrivileges.allows.space.feature[featureId] || [];
    }
    return effectivePrivileges.allows.global.feature[featureId] || [];
  }

  private getAssignedFeaturePrivileges(featureId: string): string[] {
    const { role, spaceId } = this.props;
    if (spaceId && role.kibana.space.hasOwnProperty(spaceId)) {
      return role.kibana.space[spaceId].feature[featureId] || [];
    }
    return role.kibana.global.feature[featureId] || [];
  }
}
