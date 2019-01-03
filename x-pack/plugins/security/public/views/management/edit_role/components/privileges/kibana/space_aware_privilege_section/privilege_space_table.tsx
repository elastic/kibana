/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiInMemoryTable,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { getSpaceColor } from 'x-pack/plugins/spaces/common';
import { Space } from 'x-pack/plugins/spaces/common/model/space';
import {
  EffectivePrivilegesFactory,
  PRIVILEGE_SOURCE,
} from '../../../../../../../lib/effective_privileges';
import { copyRole } from '../../../../lib/copy_role';

interface Props {
  role: Role;
  effectivePrivilegesFactory: EffectivePrivilegesFactory;
  onChange: (role: Role) => void;
  onEdit: (spacesIndex: number) => void;
  displaySpaces: Space[];
}

export class PrivilegeSpaceTable extends Component<Props, {}> {
  public render() {
    return this.renderKibanaPrivileges();
  }

  private renderKibanaPrivileges = () => {
    const { role, effectivePrivilegesFactory, displaySpaces } = this.props;

    const { global } = role.kibana;

    const globalPrivilege = this.locateGlobalPrivilege();

    const spacePrivileges = this.getSortedPrivileges();

    const effectivePrivileges = effectivePrivilegesFactory.getInstance(this.props.role);

    const items: any[] = [];
    // if (global.minimum.length > 0 || Object.keys(global.feature).length > 0) {
    //   items.push({
    //     isGlobal: true,
    //     spaces: [
    //       {
    //         id: '*',
    //         name: 'Global (all spaces)',
    //         initials: '*',
    //         color: '#afafaf',
    //       },
    //     ],
    //     headerSpaces: [
    //       {
    //         id: '*',
    //         name: 'Global (all spaces)',
    //         initials: '*',
    //         color: '#afafaf',
    //       },
    //     ],
    //     privileges: {
    //       minimum: global.minimum,
    //       feature: global.feature,
    //     },
    //   });
    // }

    spacePrivileges.forEach((spacePrivs, spacesIndex) => {
      items.push({
        spacesIndex,
        spaces: spacePrivs.spaces.map(spaceId => displaySpaces.find(space => space.id === spaceId)),
        headerSpaces: spacePrivs.spaces
          .filter((s, index, arr) => arr.length < 5 || index < 3)
          .map(spaceId => displaySpaces.find(space => space.id === spaceId)),
        privileges: {
          minimum: spacePrivs.minimum,
          feature: spacePrivs.feature,
        },
      });
    });

    interface TableRow {
      spaces: Space[];
      displaySpaces: Space[];
      spacesIndex: number;
      privileges: {
        minimum: string[];
        feature: {
          [featureId: string]: string[];
        };
      };
    }
    const rows: TableRow[] = spacePrivileges.map((spacePrivs, spacesIndex) => {
      const spaces = spacePrivs.spaces.map(spaceId =>
        displaySpaces.find(space => space.id === spaceId)
      ) as Space[];

      return {
        spaces,
        displaySpaces: spaces.filter((s, index, arr) => arr.length < 5 || index < 3),
        spacesIndex,
        privileges: {
          minimum: spacePrivs.minimum,
          feature: spacePrivs.feature,
        },
      };
    });

    const columns = [
      {
        field: 'displaySpaces',
        name: 'Spaces',
        width: '60%',
        render: (spaces: Space[], record: TableRow) => {
          return (
            <EuiFlexGroup wrap gutterSize={'s'}>
              {spaces.map((space: Space) => (
                <EuiFlexItem grow={false} key={space.id}>
                  <EuiBadge color={getSpaceColor(space)}>{space.name}</EuiBadge>
                </EuiFlexItem>
              ))}
              {record.spaces.length > spaces.length ? (
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
                    <EuiText>({record.spaces.length - spaces.length} more)</EuiText>
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
        render: (privileges: any, record: any) => {
          const actualPrivilege = effectivePrivileges.explainActualSpaceBasePrivilege(
            record.spacesIndex
          );

          const hasCustomizations = Object.keys(privileges.feature).length > 0;

          switch (actualPrivilege.source) {
            case PRIVILEGE_SOURCE.NONE:
            case PRIVILEGE_SOURCE.ASSIGNED_DIRECTLY:
              return (
                <EuiText>
                  {_.capitalize(hasCustomizations ? 'Custom' : actualPrivilege.privilege)}
                </EuiText>
              );
            case PRIVILEGE_SOURCE.EFFECTIVE:
              return (
                <EuiText>
                  {_.capitalize(hasCustomizations ? 'Custom' : actualPrivilege.privilege)}
                </EuiText>
              );
            case PRIVILEGE_SOURCE.EFFECTIVE_OVERRIDES_ASSIGNED:
              return (
                <EuiText>
                  {_.capitalize(hasCustomizations ? 'Custom' : actualPrivilege.privilege)}
                </EuiText>
              );
            default:
              return <EuiText color="danger">{'**unknown**'}</EuiText>;
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
              roleCopy.kibana.spaces.splice(item.spacesIndex, 1);
              this.props.onChange(roleCopy);
            },
          },
        ],
      },
    ];

    return <EuiInMemoryTable columns={columns} items={rows} />;
  };

  private locateGlobalPrivilege = () => {
    const { spaces: spacePrivileges } = this.props.role.kibana;
    return (
      spacePrivileges.find(privileges => privileges.spaces.includes('*')) || {
        spaces: ['*'],
        minimum: [],
        feature: {},
      }
    );
  };

  private getSortedPrivileges = () => {
    const { spaces: spacePrivileges } = this.props.role.kibana;
    return spacePrivileges.sort((priv1, priv2) => {
      return priv1.spaces.includes('*') ? -1 : priv1.spaces.includes('*') ? 1 : 0;
    });
  };
}
