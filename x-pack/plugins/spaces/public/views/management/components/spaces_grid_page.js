/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPage,
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

import { PageHeader } from './page_header';
import { SpacesDataStore } from '../lib/spaces_data_store';
import { DeleteSpacesButton } from './delete_spaces_button';


export class SpacesGridPage extends Component {
  state = {
    selectedSpaces: [],
    displayedSpaces: [],
    loading: true,
    searchCriteria: '',
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: 0,
      pageSizeOptions: [10, 25, 50]
    }
  };

  constructor(props) {
    super(props);
    this.dataStore = new SpacesDataStore();
  }

  componentDidMount() {
    this.loadGrid();
  }

  render() {
    const filteredSpaces = this.dataStore.search(this.state.searchCriteria);

    const pagination = {
      ...this.state.pagination,
      totalItemCount: filteredSpaces.length
    };

    return (
      <EuiPage>
        <PageHeader breadcrumbs={this.props.breadcrumbs}/>
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
              incremental: true
            }}
            onChange={this.onSearchChange}
          />
          <EuiSpacer size={'xl'} />
          <EuiBasicTable
            items={this.state.displayedSpaces}
            columns={this.getColumnConfig()}
            selection={this.getSelectionConfig()}
            pagination={pagination}
            onChange={this.onTableChange}
          />
        </EuiPageContent>
      </EuiPage>
    );
  }

  getPrimaryActionButton() {
    if (this.state.selectedSpaces.length > 0) {
      return (
        <DeleteSpacesButton
          spaces={this.state.selectedSpaces}
          httpAgent={this.props.httpAgent}
          chrome={this.props.chrome}
          onDelete={this.loadGrid}
        />
      );
    }

    return (
      <EuiButton fill onClick={() => { window.location.hash = `#/management/spaces/create`; }}>Create new space</EuiButton>
    );
  }

  loadGrid = () => {
    const {
      httpAgent,
      chrome
    } = this.props;

    this.setState({
      loading: true,
      displayedSpaces: [],
      selectedSpaces: []
    });

    this.dataStore.loadSpaces([]);

    const setSpaces = (spaces) => {
      this.dataStore.loadSpaces(spaces);
      this.setState({
        loading: false,
        displayedSpaces: this.dataStore.getPage(this.state.pagination.pageIndex, this.state.pagination.pageSize)
      });
    };

    httpAgent
      .get(chrome.addBasePath(`/api/spaces/v1/spaces`))
      .then(response => {
        setSpaces(response.data);
      })
      .catch(error => {
        this.setState({
          loading: false,
          error
        });
      });
  };

  getColumnConfig() {
    return [{
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
    }, {
      field: 'urlContext',
      name: 'URL Context',
      sortable: true
    }];
  }

  getSelectionConfig() {
    return {
      itemId: 'id',
      selectable: (space) => space.id,
      onSelectionChange: this.onSelectionChange
    };
  }

 onTableChange = ({ page = {} }) => {
   const {
     index: pageIndex,
     size: pageSize
   } = page;

   this.setState({
     pagination: {
       ...this.state.pagination,
       pageIndex,
       pageSize
     }
   });
 };

  onSelectionChange = (selectedSpaces) => {
    this.setState({ selectedSpaces });
  };

  onSearchChange = ({ text = '' }) => {
    this.dataStore.search(text);
    this.setState({
      searchCriteria: text,
      displayedSpaces: this.dataStore.getPage(this.state.pagination.pageIndex, this.state.pagination.pageSize)
    });
  };
}

SpacesGridPage.propTypes = {
  chrome: PropTypes.object.isRequired,
  httpAgent: PropTypes.func.isRequired,
  breadcrumbs: PropTypes.array.isRequired
};
