/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  // @ts-ignore
  EuiInMemoryTable,
  // @ts-ignore
  EuiSuperSelect,
  EuiText,
  // @ts-ignore
  EuiToolTip,
} from '@elastic/eui';
import { EffectivePrivileges } from 'plugins/security/lib/effective_privileges';
import React, { Component, Fragment } from 'react';
import { Role } from 'x-pack/plugins/security/common/model/role';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { SpaceAvatar } from '../../../../../../../../../spaces/public/components';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';

interface Props {
  role: Role;
  spaces: Space[];
  features: Feature[];
  effectivePrivileges: EffectivePrivileges;
}

export class PrivilegeMatrix extends Component<Props, {}> {
  public render() {
    const { role, features } = this.props;

    const { global, spaces: spacePrivileges = [] } = role.kibana;

    const items: any[] = [];
    if (global.minimum.length > 0 || Object.keys(global.feature).length > 0) {
      items.push({
        isGlobal: true,
        spaces: [
          {
            id: '*',
            name: 'Global (all spaces)',
            initials: '*',
            color: '#afafaf',
          },
        ],
        headerSpaces: [
          {
            id: '*',
            name: 'Global (all spaces)',
            initials: '*',
            color: '#afafaf',
          },
        ],
        privileges: {
          minimum: global.minimum,
          feature: global.feature,
        },
      });
    }

    spacePrivileges.forEach((spacePrivs, spacesIndex) => {
      items.push({
        spacesIndex,
        spaces: spacePrivs.spaces.map(spaceId =>
          this.props.spaces.find(space => space.id === spaceId)
        ),
        headerSpaces: spacePrivs.spaces
          .filter((s, index, arr) => arr.length < 5 || index < 3)
          .map(spaceId => this.props.spaces.find(space => space.id === spaceId)),
        privileges: {
          minimum: spacePrivs.minimum,
          feature: spacePrivs.feature,
        },
      });
    });

    interface TableRow {
      feature: Feature & { isBase: boolean };
      tooltip?: string;
      role: Role;
    }
    const rows: TableRow[] = [
      {
        feature: {
          id: '*base*',
          isBase: true,
          name: 'Base privilege',
          privileges: {},
        },
        tooltip: 'something goes here',
        role,
      },
      ...features.map(feature => ({
        feature: {
          ...feature,
          isBase: false,
        },
        role,
      })),
    ];

    const columns = [
      {
        field: 'feature',
        name: 'Feature',
        render: (feature: Feature & { isBase: boolean }) => {
          return (
            <EuiText
              style={{
                fontWeight: feature.isBase ? 'bold' : 'normal',
              }}
            >
              {feature.icon && <EuiIcon type={feature.icon} style={{ marginRight: '10px' }} />}{' '}
              {feature.name}
            </EuiText>
          );
        },
      },
      ...items.map(item => {
        return {
          field: 'feature',
          name: (
            <EuiFlexGroup wrap gutterSize={'xs'}>
              <Fragment>
                {item.headerSpaces.map((space: Space) => (
                  <EuiFlexItem grow={false} key={space.id}>
                    <EuiText>
                      <SpaceAvatar space={space} /> {item.isGlobal && space.name}{' '}
                    </EuiText>
                  </EuiFlexItem>
                ))}
                {item.headerSpaces.length !== item.spaces.length && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        <ul>
                          {item.spaces.map((s: Space) => (
                            <li key={s.id}>{s.name}</li>
                          ))}
                        </ul>
                      }
                    >
                      <EuiText>({item.spaces.length - item.headerSpaces.length} more)</EuiText>
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </Fragment>
            </EuiFlexGroup>
          ),
          render: (feature: Feature & { isBase: boolean }, record: TableRow) => {
            const { kibana } = record.role;

            if (item.isGlobal) {
              if (feature.isBase) {
                return (
                  <EuiText color={kibana.global.minimum ? 'default' : 'subdued'}>
                    {_.capitalize((kibana.global.minimum || []).join(',') || 'None')}
                  </EuiText>
                );
              }

              const actualPrivileges = this.props.effectivePrivileges.getActualGlobalFeaturePrivilege(
                feature.id
              );

              return (
                <EuiText color={actualPrivileges ? 'default' : 'subdued'}>
                  {_.capitalize(actualPrivileges || NO_PRIVILEGE_VALUE)}
                </EuiText>
              );
            } else {
              // not global
              const actualPrivileges = this.props.effectivePrivileges.getActualSpaceFeaturePrivilege(
                feature.id,
                item.spacesIndex
              );

              return (
                <EuiText color={actualPrivileges ? 'default' : 'subdued'}>
                  {_.capitalize(actualPrivileges || NO_PRIVILEGE_VALUE)}
                </EuiText>
              );
            }
          },
        };
      }),
    ];

    const table = <EuiInMemoryTable columns={columns} items={rows} />;

    return table;
  }
}
