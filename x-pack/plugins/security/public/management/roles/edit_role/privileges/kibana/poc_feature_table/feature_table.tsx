/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiButtonGroup,
  EuiIconTip,
  EuiInMemoryTable,
  EuiText,
  EuiButtonIcon,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
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
import { PrivilegeFormCalculator } from '../privilege_calculator';
import { FeatureTableCell } from '../feature_table_cell';

interface Props {
  role: Role;
  privilegeCalculator: PrivilegeFormCalculator;
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
                  this.props.role.kibana[this.props.spacesIndex].feature[featureId] ?? []
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
          return <FeatureTableCell feature={feature} />;
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
                privileges={[NO_PRIVILEGE_VALUE, 'read', 'all']}
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

          const selectedPrivilegeId = this.props.privilegeCalculator.getDisplayedPrimaryFeaturePrivilege(
            feature.id
          )?.id;

          const options = featurePrivileges
            .filter(fp => fp instanceof PrimaryFeaturePrivilege && !fp.isMinimalFeaturePrivilege())
            .map(privilege => {
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
          if (this.props.privilegeCalculator.hasNonSupersededSubFeaturePrivileges(feature.id)) {
            warningIcon = <EuiIconTip type="alert" color="warning" content="AHHHH" />;
          }

          return (
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem>{warningIcon}</EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonGroup
                  name={`featurePrivilege_${feature.id}`}
                  data-test-subj={`primaryFeaturePrivilegeControl`}
                  buttonSize="s"
                  isFullWidth={true}
                  options={options}
                  idSelected={`${feature.id}_${selectedPrivilegeId ?? NO_PRIVILEGE_VALUE}`}
                  onChange={this.onChange(feature.id)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
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
