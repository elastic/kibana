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
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';

import { DeleteSpacesButton } from '../components';
import { isReservedSpace } from '../../../../common';

export class SpacesGridPage extends Component {
  state = {
    selectedSpaces: [],
    spaces: [],
    loading: true
  };

  componentDidMount() {
    this.loadGrid();
  }

  render() {
    return (
      <EuiPage>
        <EuiPageContent>
          <EuiFlexGroup justifyContent={'spaceBetween'}>
            <EuiFlexItem grow={false}>
              <EuiText><h1>Spaces</h1></EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{this.getPrimaryActionButton()}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size={'xl'} />

          <EuiInMemoryTable
            itemId={"id"}
            items={this.state.spaces}
            columns={this.getColumnConfig()}
            selection={{
              selectable: (space) => !isReservedSpace(space),
              onSelectionChange: this.onSelectionChange
            }}
            pagination={true}
            search={{
              box: {
                placeholder: 'Search'
              }
            }}
            loading={this.state.loading}
            message={this.state.loading ? "loading..." : undefined}
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
          spacesManager={this.props.spacesManager}
          spacesNavState={this.props.spacesNavState}
          onDelete={this.loadGrid}
        />
      );
    }

    return (
      <EuiButton fill onClick={() => { window.location.hash = `#/management/spaces/create`; }}>Create space</EuiButton>
    );
  }

  loadGrid = () => {
    const {
      spacesManager
    } = this.props;

    this.setState({
      loading: true,
      selectedSpaces: [],
      spaces: []
    });

    const setSpaces = (spaces) => {
      this.setState({
        loading: false,
        spaces,
      });
    };

    spacesManager.getSpaces()
      .then(spaces => {
        setSpaces(spaces);
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
      field: 'id',
      name: 'Identifier',
      sortable: true
    }, {
      field: 'description',
      name: 'Description',
      sortable: true
    }];
  }

  onSelectionChange = (selectedSpaces) => {
    this.setState({ selectedSpaces });
  };
}

SpacesGridPage.propTypes = {
  spacesManager: PropTypes.object.isRequired,
  spacesNavState: PropTypes.object.isRequired,
};
