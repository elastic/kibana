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
} from '@elastic/eui';
import { PrivilegeSelector } from './privilege_selector';
import { SpaceAvatar } from '../../../../../../../../spaces/public/views/components/space_avatar';
import { isReservedRole } from '../../../../../../lib/role';

export class PrivilegeSpaceTable extends Component {
  render() {
    const {
      role,
      spaces,
      kibanaPrivileges,
      spacePrivileges,
    } = this.props;

    const tableItems = Object.keys(spacePrivileges).map(spaceId => {
      return {
        space: spaces.find(s => s.id === spaceId),
        privilege: spacePrivileges[spaceId][0]
      };
    }).filter(item => !!item.space);

    if (tableItems.length === 0) {
      return null;
    }

    return (
      <EuiInMemoryTable
        columns={[{
          field: 'space',
          name: 'Space',
          width: '60%',
          render: (space) => (
            <EuiFlexGroup responsive={false} alignItems={'center'}>
              <EuiFlexItem grow={false}><SpaceAvatar space={space} /></EuiFlexItem>
              <EuiFlexItem><EuiText>{space.name}</EuiText></EuiFlexItem>
            </EuiFlexGroup>
          )
        }, {
          field: 'privilege',
          name: 'Privilege',
          render: (privilege) => {
            return (
              <PrivilegeSelector
                kibanaPrivileges={kibanaPrivileges}
                value={privilege}
                disabled={isReservedRole(role)}
                onChange={this.onEditSpacePermissionsClick}
              />
            );
          }
        }, {
          name: 'Actions',
          actions: [{
            name: 'Edit',
            description: 'Edit permissions for this space',
            icon: 'pencil',
            onClick: this.onEditSpacePermissionsClick
          }, {
            name: 'Delete',
            description: 'Remove custom permissions for this space',
            icon: 'trash',
            onClick: this.onDeleteSpacePermissionsClick
          }]
        }]}
        items={tableItems}
      />
    );
  }

  onEditSpacePermissionsClick = () => {

  }

  onDeleteSpacePermissionsClick = () => {

  }
}

PrivilegeSpaceTable.propTypes = {
  role: PropTypes.object.isRequired,
  spaces: PropTypes.array.isRequired,
  kibanaPrivileges: PropTypes.object.isRequired,
  spacePrivileges: PropTypes.object.isRequired,
};
