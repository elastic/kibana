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
import { FeaturePrivilegeSet, Role } from '../../../../../../../../common/model';
import { EffectivePrivilegesFactory } from '../../../../../../../lib/effective_privileges';
import { copyRole } from '../../../../lib/copy_role';
import { PrivilegeDisplay } from './privilege_display';

const SPACES_DISPLAY_COUNT = 4;

interface Props {
  role: Role;
  effectivePrivilegesFactory: EffectivePrivilegesFactory;
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
    base: string[];
    feature: FeaturePrivilegeSet;
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
    const { effectivePrivilegesFactory, displaySpaces, intl } = this.props;

    const spacePrivileges = this.getSortedPrivileges();

    const effectivePrivileges = effectivePrivilegesFactory.getInstance(this.props.role);

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
        isGlobal: spacePrivs.spaces.includes('*'),
        privileges: {
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
          if (spaces.length > displayedSpaces.length) {
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
        render: (privileges: any, record: TableRow) => {
          const actualPrivilege = effectivePrivileges.explainActualSpaceBasePrivilege(
            record.spacesIndex
          );

          const hasCustomizations = Object.keys(privileges.feature).length > 0;

          return (
            <PrivilegeDisplay
              scope={record.isGlobal ? 'global' : 'space'}
              explanation={hasCustomizations ? undefined : actualPrivilege}
              privilege={hasCustomizations ? 'Custom' : actualPrivilege.privilege}
            />
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
      <EuiInMemoryTable
        columns={columns}
        items={rows}
        hasActions
        rowProps={(item: TableRow) => {
          // TODO: Find the global space the right way
          return {
            className: item.spaces[0].id === '*' ? 'secPrivilegeTable__row--isGlobalSpace' : '',
          };
        }}
      />
    );
  };

  private getSortedPrivileges = () => {
    const spacePrivileges = this.props.role.kibana;
    return spacePrivileges.sort((priv1, priv2) => {
      return priv1.spaces.includes('*') ? -1 : priv1.spaces.includes('*') ? 1 : 0;
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
