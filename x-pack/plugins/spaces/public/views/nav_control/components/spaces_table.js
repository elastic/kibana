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
  EuiText,
  EuiInMemoryTable,
  EuiLink,
} from '@elastic/eui';
import './spaces_table.less';

export class SpacesTable extends Component {
  static propTypes = {
    spaces: PropTypes.array.isRequired,
    onSelectSpace: PropTypes.func.isRequired,
  }

  render() {
    return (
      <div className="spaceSelectorMenu">
        <EuiFlexGroup direction={'column'} responsive={false}>
          <EuiFlexItem>
            <EuiInMemoryTable
              itemId={"id"}
              items={this.props.spaces}
              columns={this.getColumnConfig()}
              pagination={this.props.spaces.length > 10 && {
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
      name: '',
      render: (value, record) => {
        return (
          <EuiLink onClick={() => this.props.onSelectSpace(record)} className="spaceSelectorMenu__spaceLink">
            <EuiFlexGroup alignItems="baseline">
              <EuiFlexItem grow={false}>
                <SpaceAvatar space={record} size="s" />
              </EuiFlexItem>
              <EuiFlexItem className="spaceSelectorMenu__spaceName">
                <EuiText grow={false}><p className="eui-textTruncate">{value}</p></EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        );
      }
    }];
  }
}
