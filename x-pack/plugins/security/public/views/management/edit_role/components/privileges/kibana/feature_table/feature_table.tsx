/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiButtonGroup,
  EuiIcon,
  EuiIconTip,
  // @ts-ignore
  EuiInMemoryTable,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { Component } from 'react';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { PrivilegeDefinition, Role } from '../../../../../../../../common/model';
import {
  EffectivePrivileges,
  ExplanationResult,
  PRIVILEGE_SOURCE,
} from '../../../../../../../lib/effective_privileges';
import { isGlobalPrivilegeDefinition } from '../../../../../../../lib/privilege_utils';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';
import { PrivilegeDisplay } from '../space_aware_privilege_section/privilege_display';
import { ChangeAllPrivilegesControl } from './change_all_privileges';

interface Props {
  role: Role;
  features: Feature[];
  effectivePrivileges: EffectivePrivileges;
  privilegeDefinition: PrivilegeDefinition;
  intl: InjectedIntl;
  spacesIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  disabled?: boolean;
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

    const { rankedFeaturePrivileges } = effectivePrivileges;
    // TODO: This simply grabs the available privileges from the first feature we encounter.
    // As of now, features can have 'all' and 'read' as available privileges. Once that assumption breaks,
    // this will need updating. This is a simplifying measure to enable the new UI.
    const availablePrivileges = Object.values(rankedFeaturePrivileges)[0];

    return (
      <EuiInMemoryTable
        responsive={false}
        columns={this.getColumns(availablePrivileges)}
        items={items}
      />
    );
  }

  public onChange = (featureId: string) => (featurePrivilegeId: string) => {
    const privilege = featurePrivilegeId.substr(`${featureId}_`.length);
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChange(featureId, []);
    } else {
      this.props.onChange(featureId, [privilege]);
    }
  };

  private getColumns = (availablePrivileges: string[]) => [
    {
      field: 'feature',
      name: this.props.intl.formatMessage({
        id: 'xpack.security.management.editRole.featureTable.enabledRoleFeaturesFeatureColumnTitle',
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
              iconProps={{
                className: 'eui-alignTop',
              }}
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
      name: (
        <span>
          <FormattedMessage
            id="xpack.security.management.editRole.featureTable.enabledRoleFeaturesEnabledColumnTitle"
            defaultMessage="Privilege"
          />
          {!this.props.disabled && (
            <ChangeAllPrivilegesControl
              privileges={[...availablePrivileges, NO_PRIVILEGE_VALUE]}
              onChange={this.onChangeAllFeaturePrivileges}
            />
          )}
        </span>
      ),
      render: (roleEntry: Role, record: TableRow) => {
        const featureId = record.feature.id;

        const featurePrivileges = this.props.privilegeDefinition
          .getFeaturePrivileges()
          .getPrivileges(featureId);

        if (!featurePrivileges) {
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
            <PrivilegeDisplay
              scope={this.isConfiguringGlobalPrivileges() ? 'global' : 'space'}
              privilege={actualPrivilegeValue}
              explanation={privilegeExplanation}
            />
          );
        }

        const options = availablePrivileges.map(priv => {
          return {
            id: `${featureId}_${priv}`,
            label: _.capitalize(priv),
            isDisabled: !enabledFeaturePrivileges.includes(priv),
          };
        });

        options.push({
          id: `${featureId}_${NO_PRIVILEGE_VALUE}`,
          label: 'None',
          isDisabled: !allowsNone,
        });

        return (
          <EuiButtonGroup
            name={`featurePrivilege_${featureId}`}
            options={options}
            idSelected={`${featureId}_${actualPrivilegeValue || NO_PRIVILEGE_VALUE}`}
            onChange={this.onChange(featureId)}
          />
        );
      },
    },
  ];

  private getEnabledFeaturePrivileges = (featurePrivileges: string[], featureId: string) => {
    const { effectivePrivileges } = this.props;

    if (this.isConfiguringGlobalPrivileges()) {
      // Global feature privileges are not limited by effective privileges.
      return featurePrivileges;
    }

    return featurePrivileges.filter(p =>
      effectivePrivileges.canAssignSpaceFeaturePrivilege(featureId, p, this.props.spacesIndex)
    );
  };

  private getPrivilegeExplanation = (featureId: string): ExplanationResult => {
    const { effectivePrivileges, spacesIndex } = this.props;

    if (this.isConfiguringGlobalPrivileges()) {
      // Global feature privileges are not limited by effective privileges.
      return {
        privilege: effectivePrivileges.getActualGlobalFeaturePrivilege(featureId),
        source: PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY,
        details: '',
      };
    }

    return effectivePrivileges.explainActualSpaceFeaturePrivilege(featureId, spacesIndex);
  };

  private allowsNoneForPrivilegeAssignment = (featureId: string): boolean => {
    if (this.isConfiguringGlobalPrivileges()) {
      return [PRIVILEGE_SOURCE.NONE, PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY].includes(
        this.getPrivilegeExplanation(featureId).source
      );
    }

    return this.props.effectivePrivileges.canAssignSpaceFeaturePrivilege(
      featureId,
      NO_PRIVILEGE_VALUE,
      this.props.spacesIndex
    );
  };

  private onChangeAllFeaturePrivileges = (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChangeAll([]);
    } else {
      this.props.onChangeAll([privilege]);
    }
  };

  private isConfiguringGlobalPrivileges = () =>
    isGlobalPrivilegeDefinition(this.props.role.kibana[this.props.spacesIndex]);
}
