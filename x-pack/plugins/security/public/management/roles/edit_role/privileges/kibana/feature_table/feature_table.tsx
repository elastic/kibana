/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonGroup,
  EuiIconTip,
  EuiInMemoryTable,
  EuiText,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { Role } from '../../../../../../../common/model';
import { ChangeAllPrivilegesControl } from './change_all_privileges';
import { FeatureTableExpandedRow } from './feature_table_expanded_row';
import { NO_PRIVILEGE_VALUE } from '../constants';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { FeatureTableCell } from '../feature_table_cell';
import { KibanaPrivileges, SecuredFeature, KibanaPrivilege } from '../../../../model';

interface Props {
  role: Role;
  privilegeCalculator: PrivilegeFormCalculator;
  kibanaPrivileges: KibanaPrivileges;
  privilegeIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  canCustomizeSubFeaturePrivileges: boolean;
  disabled?: boolean;
}

interface State {
  expandedFeatures: string[];
}

interface TableRow {
  featureId: string;
  feature: SecuredFeature;
  inherited: KibanaPrivilege[];
  effective: KibanaPrivilege[];
  role: Role;
}

export class FeatureTable extends Component<Props, State> {
  public static defaultProps = {
    privilegeIndex: -1,
    showLocks: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      expandedFeatures: [],
    };
  }

  public render() {
    const { role, kibanaPrivileges } = this.props;

    const featurePrivileges = kibanaPrivileges
      .getSecuredFeatures()
      .filter((feature) => feature.privileges != null || feature.reserved != null);

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
      .map((feature) => {
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
                feature={featurePrivileges.find((f) => f.id === featureId)!}
                privilegeIndex={this.props.privilegeIndex}
                onChange={this.props.onChange}
                privilegeCalculator={this.props.privilegeCalculator}
                selectedFeaturePrivileges={
                  this.props.role.kibana[this.props.privilegeIndex].feature[featureId] ?? []
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
    const basePrivileges = this.props.kibanaPrivileges.getBasePrivileges(
      this.props.role.kibana[this.props.privilegeIndex]
    );

    const columns = [];

    if (this.props.canCustomizeSubFeaturePrivileges) {
      columns.push({
        width: '30px',
        isExpander: true,
        field: 'featureId',
        name: '',
        render: (featureId: string, record: TableRow) => {
          const { feature } = record;
          const hasSubFeaturePrivileges = feature.getSubFeaturePrivileges().length > 0;
          if (!hasSubFeaturePrivileges) {
            return null;
          }
          return (
            <EuiButtonIcon
              onClick={() => this.toggleExpandedFeature(featureId)}
              data-test-subj={`expandFeaturePrivilegeRow expandFeaturePrivilegeRow-${featureId}`}
              aria-label={this.state.expandedFeatures.includes(featureId) ? 'Collapse' : 'Expand'}
              iconType={this.state.expandedFeatures.includes(featureId) ? 'arrowUp' : 'arrowDown'}
            />
          );
        },
      });
    }

    columns.push(
      {
        field: 'feature',
        width: '200px',
        name: i18n.translate(
          'xpack.security.management.editRole.featureTable.enabledRoleFeaturesFeatureColumnTitle',
          {
            defaultMessage: 'Feature',
          }
        ),
        render: (feature: SecuredFeature) => {
          return <FeatureTableCell feature={feature} />;
        },
      },
      {
        field: 'privilege',
        width: '200px',
        name: (
          <span>
            <FormattedMessage
              id="xpack.security.management.editRole.featureTable.enabledRoleFeaturesEnabledColumnTitle"
              defaultMessage="Privilege"
            />
            {!this.props.disabled && (
              <ChangeAllPrivilegesControl
                privileges={basePrivileges}
                onChange={this.onChangeAllFeaturePrivileges}
              />
            )}
          </span>
        ),
        mobileOptions: {
          // Table isn't responsive, so skip rendering this for mobile. <ChangeAllPrivilegesControl /> isn't free...
          header: false,
        },
        render: (roleEntry: Role, record: TableRow) => {
          const { feature } = record;

          const primaryFeaturePrivileges = feature.getPrimaryFeaturePrivileges();

          if (feature.reserved && primaryFeaturePrivileges.length === 0) {
            return (
              <EuiText size={'s'} data-test-subj="reservedFeatureDescription">
                {feature.reserved.description}
              </EuiText>
            );
          }

          if (primaryFeaturePrivileges.length === 0) {
            return null;
          }

          const selectedPrivilegeId = this.props.privilegeCalculator.getDisplayedPrimaryFeaturePrivilegeId(
            feature.id,
            this.props.privilegeIndex
          );

          const options = primaryFeaturePrivileges.map((privilege) => {
            return {
              id: `${feature.id}_${privilege.id}`,
              label: privilege.name,
              isDisabled: this.props.disabled,
            };
          });

          options.push({
            id: `${feature.id}_${NO_PRIVILEGE_VALUE}`,
            label: 'None',
            isDisabled: this.props.disabled,
          });

          let warningIcon = <EuiIconTip type="empty" content={null} />;
          if (
            this.props.privilegeCalculator.hasCustomizedSubFeaturePrivileges(
              feature.id,
              this.props.privilegeIndex
            )
          ) {
            warningIcon = (
              <EuiIconTip
                type="iInCircle"
                content={
                  <FormattedMessage
                    id="xpack.security.management.editRole.featureTable.privilegeCustomizationTooltip"
                    defaultMessage="Feature has customized sub-feature privileges. Expand this row for more information."
                  />
                }
              />
            );
          }

          return (
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>{warningIcon}</EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonGroup
                  name={`featurePrivilege_${feature.id}`}
                  data-test-subj={`primaryFeaturePrivilegeControl`}
                  buttonSize="compressed"
                  color={'primary'}
                  isFullWidth={true}
                  options={options}
                  idSelected={`${feature.id}_${selectedPrivilegeId ?? NO_PRIVILEGE_VALUE}`}
                  onChange={this.onChange(feature.id)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      }
    );
    return columns;
  };

  private toggleExpandedFeature = (featureId: string) => {
    if (this.state.expandedFeatures.includes(featureId)) {
      this.setState({
        expandedFeatures: this.state.expandedFeatures.filter((ef) => ef !== featureId),
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
