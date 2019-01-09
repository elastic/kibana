/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiBadgeProps,
  EuiButtonEmpty,
  // @ts-ignore
  EuiInMemoryTable,
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
    minimum: string[];
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
          minimum: spacePrivs.minimum,
          feature: spacePrivs.feature,
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
            <div>
              {spaces.slice(0, SPACES_DISPLAY_COUNT).map((space: TableSpace) => (
                <EuiBadge
                  key={space.id}
                  {...getExtraBadgeProps(space)}
                  color={getSpaceColor(space)}
                >
                  {space.name}
                </EuiBadge>
              ))}
              {record.spaces.length > SPACES_DISPLAY_COUNT ? (
                // TODO: Hook me up to expand table row to display all spaces inline
                <EuiButtonEmpty size="xs">
                  +{spaces.length - SPACES_DISPLAY_COUNT} more
                </EuiButtonEmpty>
              ) : null}
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
            name: 'Edit',
            description: 'Edit these privileges',
            icon: 'pencil',
            type: 'icon',
            onClick: (item: TableRow) => {
              this.props.onEdit(item.spacesIndex);
            },
          },
          {
            name: 'Delete',
            description: 'Delete these privileges',
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            onClick: (item: TableRow) => {
              const roleCopy = copyRole(this.props.role);
              roleCopy.kibana.spaces.splice(item.spacesIndex, 1);
              this.props.onChange(roleCopy);
            },
          },
        ],
      },
    ];

    return (
      <EuiInMemoryTable
        columns={columns}
        items={rows}
        // TODO: FIX the ts-ignores
        // @ts-ignore
        rowProps={item => {
          // TODO: Find the global space the right way
          return {
            className: item.spaces[0].id === '*' ? 'secPrivilegeTable__row--isGlobalSpace' : '',
          };
        }}
      />
    );
  };

  private getSortedPrivileges = () => {
    const { spaces: spacePrivileges } = this.props.role.kibana;
    return spacePrivileges.sort((priv1, priv2) => {
      return priv1.spaces.includes('*') ? -1 : priv1.spaces.includes('*') ? 1 : 0;
    });
  };
}
