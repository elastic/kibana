/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { SpaceAvatar } from '../../components/space_avatar';
import {
  SPACE_SEARCH_COUNT_THRESHOLD
} from '../../../../common/constants';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiText,
  EuiInMemoryTable,
  EuiLink,
} from '@elastic/eui';

export class SpacesTable extends Component {
  static propTypes = {
    spaces: PropTypes.array.isRequired,
    onSelectSpace: PropTypes.func.isRequired,
    showManageButton: PropTypes.bool
  }

  render() {

    return (
      <div style={{ maxWidth: '400px' }}>
        <EuiFlexGroup direction={'column'} className="spaceSelectorMenu" responsive={false}>
          <EuiFlexItem grow={false} className="spaceSelectorMenu__title"><EuiText><h4>Select a Space</h4></EuiText></EuiFlexItem>
          <EuiFlexItem>
            <EuiInMemoryTable
              itemId={"id"}
              items={this.props.spaces}
              columns={this.getColumnConfig()}
              pagination={{
                initialPageSize: 10,
                pageSizeOptions: [10]
              }}
              search={this.props.spaces.length >= SPACE_SEARCH_COUNT_THRESHOLD && {
                box: {
                  incremental: true
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  getColumnConfig() {
    return [{
      field: 'name',
      name: 'Space',
      sortable: true,
      width: '100%',
      render: (value, record) => {
        return (
          <EuiLink onClick={() => { }} style={{ width: '100%' }}>
            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem grow={false}>
                <SpaceAvatar space={record} />
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: '300px' }}>
                <EuiText grow={false}><p className="eui-textTruncate">{value}</p></EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        );
      }
    }];
  }

  buildManageButton = () => {
    if (!this.props.showManageButton) {
      return null;
    }
    return (
      <EuiFlexItem grow={false}>
        <EuiButton className={'spaceSelectorMenu__manageSpacesButton'} onClick={() => { }} size={'s'}>Manage Spaces</EuiButton>
      </EuiFlexItem>
    );
  }

  onSpaceClick = (space) => this.props.onSelectSpace.bind(this, space)
}
