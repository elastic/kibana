/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiInMemoryTable,
  EuiButtonIcon,
} from '@elastic/eui';
import { PrivilegeSelector } from './privilege_selector';
import { SpaceAvatar } from '../../../../../../../../spaces/public/views/components/space_avatar';
import { isReservedRole } from '../../../../../../lib/role';

export class PrivilegeSpaceTable extends Component {
  state = {
    searchTerm: ''
  }

  render() {
    const {
      role,
      spaces,
      availablePrivileges,
      spacePrivileges,
    } = this.props;

    const {
      searchTerm
    } = this.state;

    const allTableItems = Object.keys(spacePrivileges).map(spaceId => {
      return {
        space: spaces.find(s => s.id === spaceId),
        privilege: spacePrivileges[spaceId][0]
      };
    }).filter(item => !!item.space);

    const visibleTableItems = allTableItems.filter(item => item.space.name.toLowerCase().indexOf(searchTerm) >= 0);

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
            placeholder: 'Filter...',
          },
          onChange: (search) => {
            this.setState({
              searchTerm: search.queryText.toLowerCase()
            });
          }
        }}
        items={visibleTableItems}
      />
    );
  }

  getTableColumns = (role, availablePrivileges) => {
    const columns = [{
      field: 'space',
      name: 'Space',
      width: '50%',
      render: (space) => (
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems={'center'}>
          <EuiFlexItem grow={false}><SpaceAvatar space={space} size="s" /></EuiFlexItem>
          <EuiFlexItem><EuiText>{space.name}</EuiText></EuiFlexItem>
        </EuiFlexGroup>
      )
    }, {
      field: 'privilege',
      name: 'Privilege',
      render: (privilege, record) => {
        if (this.props.readonly) {
          return privilege;
        }

        return (
          <PrivilegeSelector
            availablePrivileges={availablePrivileges}
            value={privilege}
            disabled={isReservedRole(role) || this.props.readonly}
            onChange={this.onSpacePermissionChange(record)}
            compressed
          />
        );
      }
    }];
    if (!this.props.readonly) {
      columns.push({
        name: 'Actions',
        actions: [{
          render: (record) => {
            return (
              <EuiButtonIcon
                aria-label={'Remove custom privileges for this space'}
                color={'danger'}
                onClick={() => this.onDeleteSpacePermissionsClick(record)}
                iconType={'trash'}
              />
            );
          }
        }]
      });
    }

    return columns;
  }

  onSpacePermissionChange = (record) => (selectedPrivilege) => {
    const { id: spaceId } = record.space;

    const updatedPrivileges = {
      ...this.props.spacePrivileges
    };
    updatedPrivileges[spaceId] = [selectedPrivilege];
    this.props.onChange(updatedPrivileges);
  }

  onDeleteSpacePermissionsClick = (record) => {
    const { id: spaceId } = record.space;

    const updatedPrivileges = {
      ...this.props.spacePrivileges
    };
    delete updatedPrivileges[spaceId];
    this.props.onChange(updatedPrivileges);
  }
}

PrivilegeSpaceTable.propTypes = {
  role: PropTypes.object.isRequired,
  spaces: PropTypes.array.isRequired,
  availablePrivileges: PropTypes.array,
  spacePrivileges: PropTypes.object.isRequired,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
};
