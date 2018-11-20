/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  // @ts-ignore
  EuiInMemoryTable,
  EuiText,
} from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React, { Component } from 'react';
import { Space } from '../../../../../../../../spaces/common/model/space';
import { SpaceAvatar } from '../../../../../../../../spaces/public/components';
import { KibanaPrivilege } from '../../../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../../../common/model/role';
import { isReservedRole } from '../../../../../../lib/role';
import { PrivilegeSelector } from './privilege_selector';

interface Props {
  role: Role;
  spaces: Space[];
  availablePrivileges?: KibanaPrivilege[];
  spacePrivileges: any;
  onChange?: (privs: { [spaceId: string]: KibanaPrivilege[] }) => void;
  readonly?: boolean;
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  searchTerm: string;
}

interface DeletedSpace extends Space {
  deleted: boolean;
}

<<<<<<< HEAD
export class PrivilegeSpaceTable extends Component<Props, State> {
=======
class PrivilegeSpaceTableUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  public state = {
    searchTerm: '',
  };

  public render() {
<<<<<<< HEAD
    const { role, spaces, availablePrivileges, spacePrivileges } = this.props;
=======
    const { role, spaces, availablePrivileges, spacePrivileges, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

    const { searchTerm } = this.state;

    const allTableItems = Object.keys(spacePrivileges)
      .map(spaceId => {
        return {
          space: spaces.find(s => s.id === spaceId) || { id: spaceId, name: '', deleted: true },
          privilege: spacePrivileges[spaceId][0],
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
        columns={this.getTableColumns(role, availablePrivileges)}
        search={{
          box: {
            incremental: true,
<<<<<<< HEAD
            placeholder: 'Filter',
=======
            placeholder: intl.formatMessage({
              id: 'xpack.security.management.editRoles.privilegeSpaceTable.filterPlaceholder',
              defaultMessage: 'Filter',
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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

  public getTableColumns = (role: Role, availablePrivileges: KibanaPrivilege[] = []) => {
<<<<<<< HEAD
=======
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        name: 'Space',
        width: this.props.readonly ? '75%' : '50%',
        render: (space: Space | DeletedSpace) => {
          if ('deleted' in space) {
            return <EuiText color={'subdued'}>{space.id} (deleted)</EuiText>;
=======
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
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          } else {
            return <EuiText>{space.name}</EuiText>;
          }
        },
      },
      {
        field: 'privilege',
<<<<<<< HEAD
        name: 'Privilege',
=======
        name: intl.formatMessage({
          id: 'xpack.security.management.editRoles.privilegeSpaceTable.privilegeName',
          defaultMessage: 'Privilege',
        }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        width: this.props.readonly ? '25%' : undefined,
        render: (privilege: KibanaPrivilege, record: any) => {
          if (this.props.readonly || record.space.deleted) {
            return privilege;
          }

          return (
            <PrivilegeSelector
              data-test-subj={'privilege-space-table-priv'}
              availablePrivileges={availablePrivileges}
              value={privilege}
              disabled={isReservedRole(role) || this.props.readonly}
              onChange={this.onSpacePermissionChange(record)}
              compressed
            />
          );
        },
      },
    ];
    if (!this.props.readonly) {
      columns.push({
<<<<<<< HEAD
        name: 'Actions',
=======
        name: intl.formatMessage({
          id: 'xpack.security.management.editRoles.privilegeSpaceTable.actionsName',
          defaultMessage: 'Actions',
        }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        actions: [
          {
            render: (record: any) => {
              return (
                <EuiButtonIcon
                  aria-label={'Remove custom privileges for this space'}
                  color={'danger'}
                  onClick={() => this.onDeleteSpacePermissionsClick(record)}
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

  public onSpacePermissionChange = (record: any) => (selectedPrivilege: KibanaPrivilege) => {
    const { id: spaceId } = record.space;

    const updatedPrivileges = {
      ...this.props.spacePrivileges,
    };
    updatedPrivileges[spaceId] = [selectedPrivilege];
    if (this.props.onChange) {
      this.props.onChange(updatedPrivileges);
    }
  };

  public onDeleteSpacePermissionsClick = (record: any) => {
    const { id: spaceId } = record.space;

    const updatedPrivileges = {
      ...this.props.spacePrivileges,
    };
    delete updatedPrivileges[spaceId];
    if (this.props.onChange) {
      this.props.onChange(updatedPrivileges);
    }
  };
}
<<<<<<< HEAD
=======

export const PrivilegeSpaceTable = injectI18n(PrivilegeSpaceTableUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
