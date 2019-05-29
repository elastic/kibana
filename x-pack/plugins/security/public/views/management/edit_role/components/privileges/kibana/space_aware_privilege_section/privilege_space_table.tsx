/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiBadgeProps,
  EuiButtonEmpty,
  EuiButtonIcon,
  // @ts-ignore
  EuiInMemoryTable,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { Component } from 'react';
import { getSpaceColor } from '../../../../../../../../../spaces/common';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import {
  FeaturesPrivileges,
  Role,
  RoleKibanaPrivilege,
} from '../../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../../lib/kibana_privilege_calculator';
import {
  hasAssignedFeaturePrivileges,
  isGlobalPrivilegeDefinition,
} from '../../../../../../../lib/privilege_utils';
import { copyRole } from '../../../../../../../lib/role_utils';
import { CUSTOM_PRIVILEGE_VALUE } from '../../../../lib/constants';
import { SpacesPopoverList } from '../../../spaces_popover_list';
import { PrivilegeDisplay } from './privilege_display';

const SPACES_DISPLAY_COUNT = 4;

interface Props {
  role: Role;
  privilegeCalculatorFactory: KibanaPrivilegeCalculatorFactory;
  onChange: (role: Role) => void;
  onEdit: (spacesIndex: number) => void;
  displaySpaces: Space[];
  disabled?: boolean;
  intl: InjectedIntl;
}

interface State {
  expandedSpacesGroups: number[];
}

type TableSpace = Space &
  Partial<{
    deleted: boolean;
  }>;

interface TableRow {
  spaces: TableSpace[];
  spacesIndex: number;
  isGlobal: boolean;
  privileges: {
    spaces: string[];
    base: string[];
    feature: FeaturesPrivileges;
  };
}

export class PrivilegeSpaceTable extends Component<Props, State> {
  public state = {
    expandedSpacesGroups: [] as number[],
  };

  public render() {
    return this.renderKibanaPrivileges();
  }

  private renderKibanaPrivileges = () => {
    const { privilegeCalculatorFactory, displaySpaces, intl } = this.props;

    const spacePrivileges = this.getSortedPrivileges();

    const privilegeCalculator = privilegeCalculatorFactory.getInstance(this.props.role);

    const effectivePrivileges = privilegeCalculator.calculateEffectivePrivileges(false);

    const allowedPrivileges = privilegeCalculator.calculateAllowedPrivileges();

    const rows: TableRow[] = spacePrivileges.map((spacePrivs, spacesIndex) => {
      const spaces = spacePrivs.spaces.map(
        spaceId =>
          displaySpaces.find(space => space.id === spaceId) || {
            id: spaceId,
            name: spaceId,
            disabledFeatures: [],
            deleted: true,
          }
      ) as Space[];

      return {
        spaces,
        spacesIndex,
        isGlobal: isGlobalPrivilegeDefinition(spacePrivs),
        privileges: {
          spaces: spacePrivs.spaces,
          base: spacePrivs.base || [],
          feature: spacePrivs.feature || {},
        },
      };
    });

    const getExtraBadgeProps = (space: TableSpace): EuiBadgeProps => {
      if (space.deleted) {
        return {
          iconType: 'trash',
        };
      }
      return {};
    };

    const columns: Record<string, any> = [
      {
        field: 'spaces',
        name: 'Spaces',
        width: '60%',
        render: (spaces: TableSpace[], record: TableRow) => {
          const isExpanded = this.state.expandedSpacesGroups.includes(record.spacesIndex);
          const displayedSpaces = isExpanded ? spaces : spaces.slice(0, SPACES_DISPLAY_COUNT);

          let button = null;
          if (record.isGlobal) {
            button = (
              <SpacesPopoverList
                spaces={this.props.displaySpaces}
                intl={this.props.intl}
                buttonText={this.props.intl.formatMessage({
                  id: 'xpack.security.management.editRole.spacePrivilegeTable.showAllSpacesLink',
                  defaultMessage: 'show spaces',
                })}
              />
            );
          } else if (spaces.length > displayedSpaces.length) {
            button = (
              <EuiButtonEmpty
                size="xs"
                onClick={() => this.toggleExpandSpacesGroup(record.spacesIndex)}
              >
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeTable.showNMoreSpacesLink"
                  defaultMessage="+{count} more"
                  values={{ count: spaces.length - displayedSpaces.length }}
                />
              </EuiButtonEmpty>
            );
          } else if (isExpanded) {
            button = (
              <EuiButtonEmpty
                size="xs"
                onClick={() => this.toggleExpandSpacesGroup(record.spacesIndex)}
              >
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeTable.showLessSpacesLink"
                  defaultMessage="show less"
                />
              </EuiButtonEmpty>
            );
          }

          return (
            <div>
              {displayedSpaces.map((space: TableSpace) => (
                <EuiBadge
                  key={space.id}
                  {...getExtraBadgeProps(space)}
                  color={getSpaceColor(space)}
                >
                  {space.name}
                </EuiBadge>
              ))}
              {button}
            </div>
          );
        },
      },
      {
        field: 'privileges',
        name: 'Privileges',
        render: (privileges: RoleKibanaPrivilege, record: TableRow) => {
          const hasCustomizations = hasAssignedFeaturePrivileges(privileges);
          const effectivePrivilege = effectivePrivileges[record.spacesIndex];
          const basePrivilege = effectivePrivilege.base;

          const isAllowedCustomizations =
            allowedPrivileges[record.spacesIndex].base.privileges.length > 1;

          const showCustomize = hasCustomizations && isAllowedCustomizations;

          if (effectivePrivilege.reserved != null && effectivePrivilege.reserved.length > 0) {
            return <PrivilegeDisplay privilege={effectivePrivilege.reserved} />;
          } else if (record.isGlobal) {
            return (
              <PrivilegeDisplay
                privilege={showCustomize ? CUSTOM_PRIVILEGE_VALUE : basePrivilege.actualPrivilege}
              />
            );
          } else {
            return (
              <PrivilegeDisplay
                explanation={basePrivilege}
                privilege={showCustomize ? CUSTOM_PRIVILEGE_VALUE : basePrivilege.actualPrivilege}
              />
            );
          }
        },
      },
    ];

    if (!this.props.disabled) {
      columns.push({
        name: 'Actions',
        actions: [
          {
            render: (record: TableRow) => {
              return (
                <EuiButtonIcon
                  aria-label={intl.formatMessage(
                    {
                      id:
                        'xpack.security.management.editRole.spacePrivilegeTable.editPrivilegesLabel',
                      defaultMessage: `Edit privileges for the following spaces: {spaceNames}.`,
                    },
                    {
                      spaceNames: record.spaces.map(s => s.name).join(', '),
                    }
                  )}
                  color={'primary'}
                  iconType={'pencil'}
                  onClick={() => this.props.onEdit(record.spacesIndex)}
                />
              );
            },
          },
          {
            render: (record: TableRow) => {
              return (
                <EuiButtonIcon
                  aria-label={intl.formatMessage(
                    {
                      id:
                        'xpack.security.management.editRole.spacePrivilegeTable.deletePrivilegesLabel',
                      defaultMessage: `Delete privileges for the following spaces: {spaceNames}.`,
                    },
                    {
                      spaceNames: record.spaces.map(s => s.name).join(', '),
                    }
                  )}
                  color={'danger'}
                  iconType={'trash'}
                  onClick={() => this.onDeleteSpacePrivilege(record)}
                />
              );
            },
          },
        ],
      });
    }

    return (
      // @ts-ignore missing rowProps from typedef
      <EuiInMemoryTable
        columns={columns}
        items={rows}
        hasActions
        // @ts-ignore missing rowProps from typedef
        rowProps={(item: TableRow) => {
          return {
            className: isGlobalPrivilegeDefinition(item.privileges)
              ? 'secPrivilegeTable__row--isGlobalSpace'
              : '',
          };
        }}
      />
    );
  };

  private getSortedPrivileges = () => {
    const spacePrivileges = this.props.role.kibana;
    return spacePrivileges.sort((priv1, priv2) => {
      return isGlobalPrivilegeDefinition(priv1) ? -1 : isGlobalPrivilegeDefinition(priv2) ? 1 : 0;
    });
  };

  private toggleExpandSpacesGroup = (spacesIndex: number) => {
    if (this.state.expandedSpacesGroups.includes(spacesIndex)) {
      this.setState({
        expandedSpacesGroups: this.state.expandedSpacesGroups.filter(i => i !== spacesIndex),
      });
    } else {
      this.setState({
        expandedSpacesGroups: [...this.state.expandedSpacesGroups, spacesIndex],
      });
    }
  };

  private onDeleteSpacePrivilege = (item: TableRow) => {
    const roleCopy = copyRole(this.props.role);
    roleCopy.kibana.splice(item.spacesIndex, 1);

    this.props.onChange(roleCopy);

    this.setState({
      expandedSpacesGroups: this.state.expandedSpacesGroups.filter(i => i !== item.spacesIndex),
    });
  };
}
