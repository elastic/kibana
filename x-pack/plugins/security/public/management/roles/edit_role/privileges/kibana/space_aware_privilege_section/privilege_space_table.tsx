/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './privilege_space_table.scss';

import type { EuiBadgeProps, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
} from '@elastic/eui';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Space } from '@kbn/spaces-plugin/public';
import { getSpaceColor } from '@kbn/spaces-plugin/public';

import type { FeaturesPrivileges, Role } from '../../../../../../../common/model';
import { copyRole } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { CUSTOM_PRIVILEGE_VALUE } from '../constants';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { PrivilegeDisplay } from './privilege_display';

const SPACES_DISPLAY_COUNT = 4;

interface Props {
  role: Role;
  privilegeCalculator: PrivilegeFormCalculator;
  onChange: (role: Role) => void;
  onEdit: (privilegeIndex: number) => void;
  displaySpaces: Space[];
  disabled?: boolean;
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
  privilegeIndex: number;
  isGlobal: boolean;
  privileges: {
    spaces: string[];
    base: string[];
    feature: FeaturesPrivileges;
    reserved: string[];
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
    const { privilegeCalculator, displaySpaces } = this.props;

    const spacePrivileges = this.getSortedPrivileges();

    const rows: TableRow[] = spacePrivileges.map((spacePrivs, privilegeIndex) => {
      const spaces = spacePrivs.spaces.map(
        (spaceId) =>
          displaySpaces.find((space) => space.id === spaceId) || {
            id: spaceId,
            name: spaceId,
            disabledFeatures: [],
            deleted: true,
          }
      ) as Space[];

      return {
        spaces,
        privilegeIndex,
        isGlobal: isGlobalPrivilegeDefinition(spacePrivs),
        privileges: {
          spaces: spacePrivs.spaces,
          base: spacePrivs.base || [],
          feature: spacePrivs.feature || {},
          reserved: spacePrivs._reserved || [],
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

    const columns: Array<EuiBasicTableColumn<TableRow>> = [
      {
        field: 'spaces',
        name: 'Spaces',
        width: '60%',
        render: (spaces: TableSpace[], record: TableRow) => {
          const isExpanded = this.state.expandedSpacesGroups.includes(record.privilegeIndex);
          const displayedSpaces = isExpanded ? spaces : spaces.slice(0, SPACES_DISPLAY_COUNT);

          let button = null;
          if (spaces.length > displayedSpaces.length) {
            button = (
              <EuiButtonEmpty
                size="xs"
                onClick={() => this.toggleExpandSpacesGroup(record.privilegeIndex)}
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
                onClick={() => this.toggleExpandSpacesGroup(record.privilegeIndex)}
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
              <span data-test-subj="spacesColumn">
                {displayedSpaces.map((space: TableSpace) => (
                  <EuiBadge
                    key={space.id}
                    {...getExtraBadgeProps(space)}
                    color={getSpaceColor(space)}
                  >
                    {space.name}
                  </EuiBadge>
                ))}
              </span>

              {button}
            </div>
          );
        },
      },
      {
        field: 'privileges',
        name: 'Privileges',
        render: (privileges: TableRow['privileges'], record: TableRow) => {
          if (privileges.reserved.length > 0) {
            return (
              <PrivilegeDisplay
                privilege={privileges.reserved}
                data-test-subj={`privilegeColumn`}
              />
            );
          }

          let icon = <EuiIcon type="empty" size="s" />;
          if (privilegeCalculator.hasSupersededInheritedPrivileges(record.privilegeIndex)) {
            icon = (
              <span data-test-subj="spaceTablePrivilegeSupersededWarning">
                <EuiIconTip
                  type="alert"
                  size="s"
                  content={
                    <FormattedMessage
                      id="xpack.security.management.editRole.spacePrivilegeTable.supersededPrivilegeWarning"
                      defaultMessage="Privileges are superseded by configured global privilege. View the privilege summary to see effective privileges."
                    />
                  }
                />
              </span>
            );
          }

          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
              <EuiFlexItem>
                <PrivilegeDisplay
                  privilege={
                    privilegeCalculator.getBasePrivilege(record.privilegeIndex)?.id ??
                    CUSTOM_PRIVILEGE_VALUE
                  }
                  data-test-subj={`privilegeColumn`}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
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
                  aria-label={i18n.translate(
                    'xpack.security.management.editRole.spacePrivilegeTable.editPrivilegesLabel',
                    {
                      defaultMessage: `Edit privileges for the following spaces: {spaceNames}.`,
                      values: { spaceNames: record.spaces.map((s) => s.name).join(', ') },
                    }
                  )}
                  color={'primary'}
                  iconType={'pencil'}
                  onClick={() => this.props.onEdit(record.privilegeIndex)}
                />
              );
            },
          },
          {
            render: (record: TableRow) => {
              return (
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.security.management.editRole.spacePrivilegeTable.deletePrivilegesLabel',
                    {
                      defaultMessage: `Delete privileges for the following spaces: {spaceNames}.`,
                      values: { spaceNames: record.spaces.map((s) => s.name).join(', ') },
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
      <EuiInMemoryTable
        columns={columns}
        items={rows}
        hasActions
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

  private toggleExpandSpacesGroup = (privilegeIndex: number) => {
    if (this.state.expandedSpacesGroups.includes(privilegeIndex)) {
      this.setState({
        expandedSpacesGroups: this.state.expandedSpacesGroups.filter((i) => i !== privilegeIndex),
      });
    } else {
      this.setState({
        expandedSpacesGroups: [...this.state.expandedSpacesGroups, privilegeIndex],
      });
    }
  };

  private onDeleteSpacePrivilege = (item: TableRow) => {
    const roleCopy = copyRole(this.props.role);
    roleCopy.kibana.splice(item.privilegeIndex, 1);

    this.props.onChange(roleCopy);

    this.setState({
      expandedSpacesGroups: this.state.expandedSpacesGroups.filter(
        (i) => i !== item.privilegeIndex
      ),
    });
  };
}
