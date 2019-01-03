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
import React, { Component } from 'react';
import { PrivilegeDefinition } from 'x-pack/plugins/security/common/model/privileges/privilege_definition';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import {
  EffectivePrivileges,
  ExplanationResult,
  PRIVILEGE_SOURCE,
} from '../../../../../../../lib/effective_privileges';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';

interface Props {
  role: Role;
  features: Feature[];
  effectivePrivileges: EffectivePrivileges;
  privilegeDefinition: PrivilegeDefinition;
  intl: InjectedIntl;
  spacesIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  disabled?: boolean;
  showLocks?: boolean;
}

interface ToolTipDefinition {
  privilegeId: string;
  tooltip: string;
}

export class FeatureTable extends Component<Props, {}> {
  public static defaultProps = {
    spacesIndex: -1,
    showLocks: true,
  };

  public render() {
    const { role, features } = this.props;

    const items = features.map(feature => ({
      feature,
      role,
    }));

    return <EuiInMemoryTable columns={this.getColumns()} items={items} />;
  }

  public onChange = (featureId: string) => (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChange(featureId, []);
    } else {
      this.props.onChange(featureId, [privilege]);
    }
  };

  private getColumns = () => [
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
      name: this.props.intl.formatMessage({
        id: 'xpack.roles.management.enabledRoleFeaturesEnabledColumnTitle',
        defaultMessage: 'Privilege',
      }),
      render: (roleEntry: Role, record: Record<string, any>) => {
        const featureId = record.feature.id;

        const featurePrivileges = this.props.privilegeDefinition
          .getFeaturePrivileges()
          .getPrivileges(featureId);

        if (!featurePrivileges) {
          // TODO
          return null;
        }

        const enabledFeaturePrivileges = this.getEnabledFeaturePrivileges(
          featurePrivileges,
          featureId
        );

        const privilegeExplanation = this.getPrivilegeExplanation(featureId);

        const allowsNone = this.allowsNoneForPrivilegeAssignment(featureId);

        const actualPrivilegeValue = privilegeExplanation.privilege;

        const canChangePrivilege =
          !this.props.disabled && (allowsNone || enabledFeaturePrivileges.length > 1);

        if (!canChangePrivilege) {
          return (
            <EuiText>
              {_.capitalize(actualPrivilegeValue || 'None')}{' '}
              {this.props.showLocks && (
                <sup>
                  <EuiIconTip
                    type={'lock'}
                    content={this.props.intl.formatMessage({
                      id: 'foo',
                      defaultMessage: privilegeExplanation.details,
                    })}
                    size={'s'}
                  />
                </sup>
              )}
            </EuiText>
          );
        }

        const privilegeOptions = featurePrivileges.map(privilege => {
          const isAllowedPrivilege = enabledFeaturePrivileges.includes(privilege);
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

        return (
          <EuiSuperSelect
            compressed
            onChange={this.onChange(featureId)}
            options={[
              {
                disabled: !allowsNone,
                value: NO_PRIVILEGE_VALUE,
                inputDisplay: <EuiText color="subdued">None</EuiText>,
                dropdownDisplay: (
                  <EuiText>
                    <strong>No privileges</strong>
                  </EuiText>
                ),
              },
              ...privilegeOptions,
            ]}
            hasDividers
            valueOfSelected={actualPrivilegeValue || NO_PRIVILEGE_VALUE}
          />
        );
      },
    },
  ];

  private getEnabledFeaturePrivileges = (featurePrivileges: string[], featureId: string) => {
    const { effectivePrivileges, spacesIndex } = this.props;
    if (spacesIndex >= 0) {
      return featurePrivileges.filter(p =>
        effectivePrivileges.canAssignSpaceFeaturePrivilege(featureId, p, this.props.spacesIndex)
      );
    }
    // Global feature privileges are not limited by effective privileges.
    return featurePrivileges;
  };

  private getPrivilegeExplanation = (featureId: string): ExplanationResult => {
    const { effectivePrivileges, spacesIndex } = this.props;
    if (spacesIndex >= 0) {
      return effectivePrivileges.explainActualSpaceFeaturePrivilege(featureId, spacesIndex);
    }

    // Global feature privileges are not limited by effective privileges.
    return {
      privilege: effectivePrivileges.getActualGlobalFeaturePrivilege(featureId),
      source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
      details: '',
    };
  };

  private allowsNoneForPrivilegeAssignment = (featureId: string): boolean => {
    const { effectivePrivileges, spacesIndex } = this.props;
    if (spacesIndex >= 0) {
      return (
        effectivePrivileges.getHighestGrantedSpaceFeaturePrivilege(
          featureId,
          this.props.spacesIndex
        ) === NO_PRIVILEGE_VALUE
      );
    }

    // Global feature privileges are not limited by effective privileges.
    return true;
  };
}
