/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiIcon,
  // @ts-ignore
  EuiIconTip,
  // @ts-ignore
  EuiInMemoryTable,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
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
import { PrivilegeDisplay } from '../space_aware_privilege_section/privilege_display';

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

interface TableFeature extends Feature {
  hasAnyPrivilegeAssigned: boolean;
}

interface TableRow {
  feature: TableFeature;
  role: Role;
}

export class FeatureTable extends Component<Props, {}> {
  public static defaultProps = {
    spacesIndex: -1,
    showLocks: true,
  };

  public render() {
    const { role, features, effectivePrivileges, spacesIndex } = this.props;

    const items: TableRow[] = features.map(feature => ({
      feature: {
        ...feature,
        hasAnyPrivilegeAssigned:
          effectivePrivileges.getActualSpaceFeaturePrivilege(feature.id, spacesIndex) !==
          NO_PRIVILEGE_VALUE,
      },
      role,
    }));

    return <EuiInMemoryTable responsive={false} columns={this.getColumns()} items={items} />;
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
      render: (feature: TableFeature) => {
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
            <EuiIconTip
              // TODO: Waiting on update from EUI
              // iconProps={{
              //   className: 'eui-alignTop',
              // }}
              type={'iInCircle'}
              color={'subdued'}
              content={tooltipContent}
            />
          );
        }

        return (
          <span>
            <EuiIcon size="m" type={feature.icon} className="secPrivilegeFeatureIcon" />
            {feature.name} {tooltipElement}
          </span>
        );
      },
    },
    {
      field: 'role',
      name: this.props.intl.formatMessage({
        id: 'xpack.roles.management.enabledRoleFeaturesEnabledColumnTitle',
        defaultMessage: 'Privilege',
      }),
      render: (roleEntry: Role, record: TableRow) => {
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
          const tipProps: Record<string, string> = {};
          if (this.props.showLocks) {
            tipProps.iconType = 'lock';
            tipProps.tooltipContent = this.props.intl.formatMessage({
              id: 'foo',
              defaultMessage: privilegeExplanation.details,
            });
          }
          return <PrivilegeDisplay privilege={actualPrivilegeValue} {...tipProps} />;
        }

        const privilegeOptions = featurePrivileges.map(privilege => {
          const isAllowedPrivilege = enabledFeaturePrivileges.includes(privilege);
          return {
            disabled: !isAllowedPrivilege,
            value: privilege,
            inputDisplay: <PrivilegeDisplay privilege={privilege} styleMissingPrivilege={false} />,
            dropdownDisplay: (
              <PrivilegeDisplay privilege={privilege} styleMissingPrivilege={false} />
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
                inputDisplay: (
                  <PrivilegeDisplay privilege={NO_PRIVILEGE_VALUE} styleMissingPrivilege={false} />
                ),
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
    return [PRIVILEGE_SOURCE.NONE, PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY].includes(
      this.getPrivilegeExplanation(featureId).source
    );
  };
}
