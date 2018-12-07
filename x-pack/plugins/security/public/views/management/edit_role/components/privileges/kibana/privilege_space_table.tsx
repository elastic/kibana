/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  // @ts-ignore
  EuiInMemoryTable,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { FeaturePrivilegeSet } from 'x-pack/plugins/security/common/model/privileges/feature_privileges';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { SpaceAvatar } from '../../../../../../../../spaces/public/components';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';

interface Props {
  role: Role;
  spaces: Space[];
  onEdit?: (spaceId: string) => void;
  onDelete?: (spaceId: string) => void;
  readonly?: boolean;
  intl: InjectedIntl;
}

interface State {
  searchTerm: string;
}

interface DeletedSpace extends Space {
  deleted: boolean;
}

class PrivilegeSpaceTableUI extends Component<Props, State> {
  public state = {
    searchTerm: '',
  };

  public render() {
    const { role, spaces, intl } = this.props;

    const { searchTerm } = this.state;

    const allTableItems = Object.keys(role.kibana.space)
      .map(spaceId => {
        return {
          space: spaces.find(s => s.id === spaceId) || { id: spaceId, name: '', deleted: true },
          privilege: role.kibana.space[spaceId],
        };
      })
      .sort(item1 => {
        const isDeleted = 'deleted' in item1.space;
        return isDeleted ? 1 : -1;
      });

    const visibleTableItems = allTableItems.filter(item => {
      const isDeleted = 'deleted' in item.space;
      const searchField = isDeleted ? item.space.id : item.space.name;
      return searchField.toLowerCase().indexOf(searchTerm) >= 0;
    });

    if (allTableItems.length === 0) {
      return null;
    }

    return (
      <EuiInMemoryTable
        hasActions
        columns={this.getTableColumns()}
        search={{
          box: {
            incremental: true,
            placeholder: intl.formatMessage({
              id: 'xpack.security.management.editRoles.privilegeSpaceTable.filterPlaceholder',
              defaultMessage: 'Filter',
            }),
          },
          onChange: (search: any) => {
            this.setState({
              searchTerm: search.queryText.toLowerCase(),
            });
          },
        }}
        items={visibleTableItems}
      />
    );
  }

  public getTableColumns = () => {
    const { intl } = this.props;
    const columns: any[] = [
      {
        field: 'space',
        name: '',
        width: '50px',
        sortable: true,
        render: (space: Space | DeletedSpace) => {
          if ('deleted' in space) {
            return null;
          }
          return <SpaceAvatar space={space} size="s" />;
        },
      },
      {
        field: 'space',
        name: intl.formatMessage({
          id: 'xpack.security.management.editRoles.privilegeSpaceTable.spaceName',
          defaultMessage: 'Space',
        }),
        width: this.props.readonly ? '75%' : '50%',
        render: (space: Space | DeletedSpace) => {
          if ('deleted' in space) {
            return (
              <EuiText color={'subdued'}>
                <FormattedMessage
                  id="xpack.security.management.editRoles.privilegeSpaceTable.deletedSpaceDescription"
                  defaultMessage="{value} (deleted)"
                  values={{ value: space.id }}
                />
              </EuiText>
            );
          } else {
            return <EuiText>{space.name}</EuiText>;
          }
        },
      },
      {
        field: 'privilege',
        name: intl.formatMessage({
          id: 'xpack.security.management.editRoles.privilegeSpaceTable.privilegeName',
          defaultMessage: 'Privilege',
        }),
        width: this.props.readonly ? '25%' : undefined,
        render: (privilege: FeaturePrivilegeSet, record: any) => {
          const hasCustomPrivileges =
            privilege.minimum.length === 0 || Object.keys(privilege.feature).length > 0;

          const privilegeLabel = hasCustomPrivileges
            ? this.props.intl.formatMessage({
                id: 'xpack.security.management.editRoles.privilegeSpaceTable.customPrivilegeLabel',
                defaultMessage: 'custom',
              })
            : privilege.minimum[0];

          if (this.props.readonly || record.space.deleted) {
            return privilegeLabel;
          }

          return (
            <EuiLink
              onClick={() => {
                if (this.props.onEdit) {
                  this.props.onEdit(record.space.id);
                }
              }}
            >
              {privilegeLabel}
            </EuiLink>
          );
        },
      },
    ];
    if (!this.props.readonly) {
      columns.push({
        name: intl.formatMessage({
          id: 'xpack.security.management.editRoles.privilegeSpaceTable.actionsName',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (record: any) => {
              return (
                <EuiButtonIcon
                  aria-label={'Remove custom privileges for this space'}
                  color={'danger'}
                  onClick={() => {
                    if (this.props.onDelete) {
                      this.props.onDelete(record.space.id);
                    }
                  }}
                  iconType={'trash'}
                />
              );
            },
          },
        ],
      });
    }

    return columns;
  };
}

export const PrivilegeSpaceTable = injectI18n(PrivilegeSpaceTableUI);
