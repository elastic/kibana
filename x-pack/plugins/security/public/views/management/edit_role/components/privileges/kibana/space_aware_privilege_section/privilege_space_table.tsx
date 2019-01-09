/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiBadgeProps,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import _ from 'lodash';
import React, { Component } from 'react';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { getSpaceColor } from 'x-pack/plugins/spaces/common';
import { Space } from 'x-pack/plugins/spaces/common/model/space';
import {
  EffectivePrivilegesFactory,
  PRIVILEGE_SOURCE,
} from '../../../../../../../lib/effective_privileges';
import { copyRole } from '../../../../lib/copy_role';
import { PrivilegeDisplay, SupercededPrivilegeDisplay } from './privilege_display';

const SPACES_DISPLAY_COUNT = 4;

interface Props {
  role: Role;
  effectivePrivilegesFactory: EffectivePrivilegesFactory;
  onChange: (role: Role) => void;
  onEdit: (spacesIndex: number) => void;
  displaySpaces: Space[];
}

type TableSpace = Space &
  Partial<{
    deleted: boolean;
  }>;

interface TableRow {
  spaces: TableSpace[];
  spacesIndex: number;
  privileges: {
    base: string[];
    feature: {
      [featureId: string]: string[];
    };
  };
}

export class PrivilegeSpaceTable extends Component<Props, {}> {
  public render() {
    return this.renderKibanaPrivileges();
  }

  private renderKibanaPrivileges = () => {
    const { effectivePrivilegesFactory, displaySpaces } = this.props;

    const spacePrivileges = this.getSortedPrivileges();

    const effectivePrivileges = effectivePrivilegesFactory.getInstance(this.props.role);

    const rows: TableRow[] = spacePrivileges.map((spacePrivs, spacesIndex) => {
      const spaces = spacePrivs.spaces.map(
        spaceId =>
          displaySpaces.find(space => space.id === spaceId) || {
            id: spaceId,
            name: '',
            disabledFeatures: [],
            deleted: true,
          }
      ) as Space[];

      return {
        spaces,
        spacesIndex,
        privileges: {
          base: spacePrivs.base || [],
          feature: spacePrivs.feature || {},
        },
      };
    });

    const getExtraBadgeProps = (space: TableSpace): EuiBadgeProps => {
      if (space.deleted) {
        return {
          iconType: 'asterisk',
        };
      }
      return {};
    };

    const columns = [
      {
        field: 'spaces',
        name: 'Spaces',
        width: '60%',
        render: (spaces: TableSpace[], record: TableRow) => {
          return (
            <EuiFlexGroup wrap gutterSize={'s'}>
              {spaces.slice(0, SPACES_DISPLAY_COUNT).map((space: TableSpace) => (
                <EuiFlexItem grow={false} key={space.id}>
                  <EuiBadge {...getExtraBadgeProps(space)} color={getSpaceColor(space)}>
                    {space.name}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
              {record.spaces.length > SPACES_DISPLAY_COUNT ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <ul>
                        {record.spaces.map(s => (
                          <li key={s.id}>{s.name}</li>
                        ))}
                      </ul>
                    }
                  >
                    <EuiText>({spaces.length - SPACES_DISPLAY_COUNT} more)</EuiText>
                  </EuiToolTip>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
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

          switch (actualPrivilege.source) {
            case PRIVILEGE_SOURCE.NONE:
            case PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY:
              return (
                <PrivilegeDisplay
                  privilege={hasCustomizations ? 'Custom' : actualPrivilege.privilege}
                />
              );
            case PRIVILEGE_SOURCE.EFFECTIVE:
              return (
                <PrivilegeDisplay
                  privilege={hasCustomizations ? 'Custom' : actualPrivilege.privilege}
                />
              );
            case PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED:
              return (
                <SupercededPrivilegeDisplay
                  privilege={actualPrivilege.privilege}
                  supercededPrivilege={actualPrivilege.supercededPrivilege}
                  overrideSource={actualPrivilege.overrideSource}
                />
              );
            default:
              return <PrivilegeDisplay privilege={'**unknown**'} color="danger" />;
          }
        },
      },
      {
        name: 'Actions',
        actions: [
          {
            description: 'Edit these privileges',
            icon: 'pencil',
            onClick: (item: TableRow) => {
              this.props.onEdit(item.spacesIndex);
            },
          },
          {
            description: 'Delete these privileges',
            icon: 'trash',
            color: 'danger',
            onClick: (item: TableRow) => {
              const roleCopy = copyRole(this.props.role);
              roleCopy.kibana.splice(item.spacesIndex, 1);
              this.props.onChange(roleCopy);
            },
          },
        ],
      },
    ];

    return <EuiInMemoryTable columns={columns} items={rows} />;
  };

  private getSortedPrivileges = () => {
    const spacePrivileges = this.props.role.kibana;
    return spacePrivileges.sort((priv1, priv2) => {
      return priv1.spaces.includes('*') ? -1 : priv1.spaces.includes('*') ? 1 : 0;
    });
  };
}
