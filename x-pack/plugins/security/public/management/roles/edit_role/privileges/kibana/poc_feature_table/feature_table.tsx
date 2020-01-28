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
  EuiInMemoryTable,
  EuiText,
  IconType,
  EuiButtonIcon,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import React, { Component } from 'react';
import {
  Role,
  KibanaPrivileges,
  SecuredFeature,
  Privilege,
  PrimaryFeaturePrivilege,
} from '../../../../../../../common/model';
import { ChangeAllPrivilegesControl } from './change_all_privileges';
import { FeatureTableExpandedRow } from './feature_table_expanded_row';
import { NO_PRIVILEGE_VALUE } from '../constants';
import { ScopedPrivilegeCalculator } from '../privilege_calculator';
// TODO: move htis up to a common spot if it's to be used here...
import { PrivilegeDisplay } from '../poc_space_aware_privilege_section/privilege_display';

interface Props {
  role: Role;
  privilegeCalculator: ScopedPrivilegeCalculator;
  kibanaPrivileges: KibanaPrivileges;
  spacesIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  disabled?: boolean;
}

interface State {
  expandedFeatures: string[];
}

interface TableRow {
  featureId: string;
  feature: SecuredFeature;
  inherited: Privilege[];
  effective: Privilege[];
  role: Role;
}

export class FeatureTable extends Component<Props, State> {
  public static defaultProps = {
    spacesIndex: -1,
    showLocks: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      expandedFeatures: ['discover'],
    };
  }

  public render() {
    const { role, privilegeCalculator } = this.props;

    const featurePrivileges = privilegeCalculator.getSecuredFeatures();

    const items: TableRow[] = featurePrivileges
      .sort((feature1, feature2) => {
        if (feature1.reserved && !feature2.reserved) {
          return 1;
        }

        if (feature2.reserved && !feature1.reserved) {
          return -1;
        }

        return 0;
      })
      .map(feature => {
        return {
          featureId: feature.id,
          feature,
          inherited: [],
          effective: [],
          role,
        };
      });

    return (
      <EuiInMemoryTable
        responsive={false}
        columns={this.getColumns()}
        itemId={'featureId'}
        itemIdToExpandedRowMap={this.state.expandedFeatures.reduce((acc, featureId) => {
          return {
            ...acc,
            [featureId]: (
              <FeatureTableExpandedRow
                feature={featurePrivileges.find(f => f.id === featureId)!}
                onChange={this.props.onChange}
                privilegeCalculator={this.props.privilegeCalculator}
                selectedFeaturePrivileges={
                  this.props.role.kibana[this.props.spacesIndex].feature[featureId]
                }
                disabled={this.props.disabled}
              />
            ),
          };
        }, {})}
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

  private getColumns = () => {
    const columns = [
      {
        field: 'feature',
        name: i18n.translate(
          'xpack.security.management.editRole.featureTable.enabledRoleFeaturesFeatureColumnTitle',
          {
            defaultMessage: 'Feature',
          }
        ),
        render: (feature: SecuredFeature) => {
          let tooltipElement = null;
          if (feature.privilegesTooltip) {
            const tooltipContent = (
              <EuiText>
                <p>{feature.privilegesTooltip}</p>
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
              <EuiIcon
                size="m"
                type={feature.icon as IconType}
                className="secPrivilegeFeatureIcon"
              />
              {feature.name} {tooltipElement}
            </span>
          );
        },
      },
      {
        field: 'privilege',
        width: '*',
        name: (
          <span>
            <FormattedMessage
              id="xpack.security.management.editRole.featureTable.enabledRoleFeaturesEnabledColumnTitle"
              defaultMessage="Privilege"
            />
            {!this.props.disabled && (
              <ChangeAllPrivilegesControl
                privileges={[NO_PRIVILEGE_VALUE]}
                onChange={this.onChangeAllFeaturePrivileges}
              />
            )}
          </span>
        ),
        render: (roleEntry: Role, record: TableRow) => {
          const { feature } = record;

          if (feature.reserved) {
            return <EuiText size={'s'}>{feature.reserved.description}</EuiText>;
          }

          const featurePrivileges = this.props.privilegeCalculator.getFeaturePrivileges(feature.id);

          if (featurePrivileges.length === 0) {
            return null;
          }

          const {
            selectedPrivilegeId,
            enabledPrivilegeIds,
            areAnyInherited,
          } = this.props.privilegeCalculator.describePrimaryFeaturePrivileges(feature.id);

          const allowsNone = !areAnyInherited;

          const canChangePrivilege =
            !this.props.disabled && (allowsNone || enabledPrivilegeIds.length > 1);

          if (!canChangePrivilege) {
            const assignedBasePrivilege = Object.values(
              this.props.privilegeCalculator.describeBasePrivileges()
            ).some(p => p.directlyAssigned);

            const excludedFromBasePrivilegsTooltip = (
              <FormattedMessage
                id="xpack.security.management.editRole.featureTable.excludedFromBasePrivilegsTooltip"
                defaultMessage='Use "Custom" privileges to grant access. {featureName} isn&apos;t part of the base privileges.'
                values={{ featureName: feature.name }}
              />
            );

            return (
              <PrivilegeDisplay
                privilege={selectedPrivilegeId}
                tooltipContent={
                  assignedBasePrivilege && feature.excludeFromBasePrivileges
                    ? excludedFromBasePrivilegsTooltip
                    : undefined
                }
              />
            );
          }

          const options = featurePrivileges
            .filter(fp => fp instanceof PrimaryFeaturePrivilege && !fp.isMinimalFeaturePrivilege())
            .map(privilege => {
              return {
                id: `${feature.id}_${privilege.id}`,
                label: privilege.name,
                isDisabled: !enabledPrivilegeIds.some(ep => ep === privilege.id),
              };
            });

          options.push({
            id: `${feature.id}_${NO_PRIVILEGE_VALUE}`,
            label: 'None',
            isDisabled: !allowsNone,
          });

          return (
            <EuiButtonGroup
              name={`featurePrivilege_${feature.id}`}
              data-test-subj={`primaryFeaturePrivilegeControl`}
              buttonSize="s"
              isFullWidth={true}
              options={options}
              idSelected={`${feature.id}_${selectedPrivilegeId ?? NO_PRIVILEGE_VALUE}`}
              onChange={this.onChange(feature.id)}
            />
          );
        },
      },
      {
        align: 'right',
        width: '40px',
        isExpander: true,
        field: 'featureId',
        name: '',
        render: (featureId: string) => (
          <EuiButtonIcon
            onClick={() => this.toggleExpandedFeature(featureId)}
            data-test-subj={`expandFeaturePrivilegeRow expandFeaturePrivilegeRow-${featureId}`}
            aria-label={this.state.expandedFeatures.includes(featureId) ? 'Collapse' : 'Expand'}
            iconType={this.state.expandedFeatures.includes(featureId) ? 'arrowUp' : 'arrowDown'}
          />
        ),
      },
    ] as Array<EuiBasicTableColumn<TableRow>>;
    return columns;
  };

  private toggleExpandedFeature = (featureId: string) => {
    if (this.state.expandedFeatures.includes(featureId)) {
      this.setState({
        expandedFeatures: this.state.expandedFeatures.filter(ef => ef !== featureId),
      });
    } else {
      this.setState({
        expandedFeatures: [...this.state.expandedFeatures, featureId],
      });
    }
  };

  private onChangeAllFeaturePrivileges = (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChangeAll([]);
    } else {
      this.props.onChangeAll([privilege]);
    }
  };
}
