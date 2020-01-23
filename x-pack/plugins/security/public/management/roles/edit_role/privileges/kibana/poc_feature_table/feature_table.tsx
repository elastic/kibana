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
import { POCPrivilegeCalculator } from '../poc_privilege_calculator';
// TODO: move htis up to a common spot if it's to be used here...
import { PrivilegeDisplay } from '../poc_space_aware_privilege_section/privilege_display';

interface Props {
  role: Role;
  privilegeCalculator: POCPrivilegeCalculator;
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
    const { role, privilegeCalculator, spacesIndex, kibanaPrivileges } = this.props;

    const featurePrivileges = Array.from(kibanaPrivileges.getAllFeaturePrivileges().values());

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
        const inherited = privilegeCalculator.getInheritedFeaturePrivileges(
          role,
          spacesIndex,
          feature.id
        );

        const effective = privilegeCalculator.getEffectiveFeaturePrivileges(
          role,
          spacesIndex,
          feature.id
        );

        return {
          featureId: feature.id,
          feature,
          inherited,
          effective,
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
                spacesIndex={this.props.spacesIndex}
                feature={featurePrivileges.find(f => f.id === featureId)!}
                onChange={this.props.onChange}
                role={this.props.role}
                privilegeCalculator={this.props.privilegeCalculator}
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

          const featurePrivileges = this.props.kibanaPrivileges.getFeaturePrivileges(feature.id);

          if (featurePrivileges.length === 0) {
            return null;
          }

          const enabledFeaturePrivileges = this.getEnabledFeaturePrivileges(
            featurePrivileges,
            feature.id
          );

          const effectiveFeaturePrivileges = this.props.privilegeCalculator.getEffectiveFeaturePrivileges(
            this.props.role,
            this.props.spacesIndex,
            feature.id
          );

          const featurePrivilegeExplanations = this.props.privilegeCalculator.explainEffectiveFeaturePrivileges(
            this.props.role,
            this.props.spacesIndex,
            feature.id
          );

          // TODO: better min priv check
          const selectedPrivilege = effectiveFeaturePrivileges.find(afp => {
            const primary = record.feature.primaryFeaturePrivileges.findIndex(featurePriv =>
              afp.equals(featurePriv)
            );
            const minimalPrimary = record.feature.minimalPrimaryFeaturePrivileges.findIndex(
              featurePriv => afp.equals(featurePriv)
            );

            if (primary < 0 && minimalPrimary < 0) {
              return undefined;
            }

            if (primary < 0 || minimalPrimary < primary) {
              return record.feature.minimalPrimaryFeaturePrivileges[minimalPrimary];
            }

            return record.feature.primaryFeaturePrivileges[primary];
          });

          const selectedPrivilegeId = selectedPrivilege?.id.startsWith('minimal_')
            ? selectedPrivilege?.id.substr('minimal_'.length)
            : selectedPrivilege?.id;

          // TODO
          const allowsNone =
            !selectedPrivilegeId ||
            !featurePrivilegeExplanations.exists((fid, privilegeId, explanation) => {
              const isPrimaryFeaturePrivilege =
                explanation.privilege.privilege instanceof PrimaryFeaturePrivilege;

              const isInheritedByGlobal = explanation
                .getGrantSources()
                .global.some(gp => gp.isParentScopeOf(explanation.privilege));

              // Cannot deselect a primary feature privilege if it is inherited
              return isPrimaryFeaturePrivilege && isInheritedByGlobal;
            });

          const canChangePrivilege =
            !this.props.disabled && (allowsNone || enabledFeaturePrivileges.length > 1);

          if (!canChangePrivilege) {
            const assignedBasePrivilege =
              this.props.role.kibana[this.props.spacesIndex].base.length > 0;

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
                  assignedBasePrivilege && effectiveFeaturePrivileges.length === 0
                    ? excludedFromBasePrivilegsTooltip
                    : undefined
                }
              />
            );
          }

          const options = record.feature.primaryFeaturePrivileges.map(priv => {
            return {
              id: `${feature.id}_${priv.id}`,
              label: priv.name,
              isDisabled: !enabledFeaturePrivileges.some(ep => ep.id === priv.id),
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

  private getEnabledFeaturePrivileges = (
    featurePrivileges: Privilege[],
    featureId: string
  ): Privilege[] => {
    return featurePrivileges;
  };

  private onChangeAllFeaturePrivileges = (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChangeAll([]);
    } else {
      this.props.onChangeAll([privilege]);
    }
  };
}
