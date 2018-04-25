/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiPageContent,
  EuiBasicTable,
  EuiSearchBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';



const pagination = {
  pageIndex: 0,
  pageSize: 10,
  totalItemCount: 10000,
  pageSizeOptions: [10, 25, 50]
};

export class SpacesGridPage extends React.Component {
  state = {
    selectedSpaces: [],
    spaces: []
  }

  componentDidMount() {
    const {
      httpAgent,
      chrome
    } = this.props;

    httpAgent
      .get(chrome.addBasePath(`/api/spaces/v1/spaces`))
      .then(response => {
        this.setState({
          spaces: response.data
        });
      })
      .catch(error => {
        this.setState({
          error
        });
      });
  }

  render() {
    const {
      spaces
    } = this.state;

    return (
      <EuiPageContent>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiText><h1>Spaces</h1></EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{this.getPrimaryActionButton()}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size={'xl'} />
        <EuiSearchBar
          box={{
            placeholder: 'Search for a space...',
          }}
          onChange={() => {}}
        />
        <EuiSpacer size={'xl'} />
        <EuiBasicTable
          items={spaces}
          columns={this.getColumnConfig()}
          selection={this.getSelectionConfig()}
          pagination={pagination}
          onChange={() => {}}
        />
      </EuiPageContent>
    );
  }

  getPrimaryActionButton() {
    if (this.state.selectedSpaces.length > 0) {
      const count = this.state.selectedSpaces.length;
      return (
        <EuiButton fill color={'danger'}>
          {`Delete ${count > 1 ? `${count} spaces` : 'space'}`}
        </EuiButton>
      );
    }

    return (
      <EuiButton fill onClick={() => { window.location.hash = `#/management/spaces/create`; }}>Create new space</EuiButton>
    );
  }

  getColumnConfig() {
    const columns = [{
      field: 'name',
      name: 'Space',
      sortable: true,
      render: (value, record) => {
        return (
          <EuiLink onClick={() => { window.location.hash = `#/management/spaces/edit/${encodeURIComponent(record.id)}`; }}>
            {value}
          </EuiLink>
        );
      }
    }, {
      field: 'description',
      name: 'Description',
      sortable: true
    }];

    return columns;
  }

  getSelectionConfig() {
    return {
      itemId: 'id',
      selectable: (space) => space.id,
      onSelectionChange: this.onSelectionChange
    };
  }

  onSelectionChange = (selectedSpaces) => {
    this.setState({ selectedSpaces });
  }
}

SpacesGridPage.propTypes = {
  chrome: PropTypes.object.isRequired,
  httpAgent: PropTypes.func.isRequired
};