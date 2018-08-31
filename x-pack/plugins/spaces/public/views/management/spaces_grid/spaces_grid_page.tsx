/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiInMemoryTable,
  EuiLink,
  EuiPage,
  EuiPageContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { isReservedSpace } from '../../../../common';
import { Space } from '../../../../common/model/space';
import { SpacesManager } from '../../../lib/spaces_manager';
import { DeleteSpacesButton } from '../components';

interface Props {
  spacesManager: SpacesManager;
  spacesNavState: any;
}

interface State {
  selectedSpaces: Space[];
  spaces: Space[];
  loading: boolean;
  error: Error | null;
}

export class SpacesGridPage extends Component<Props, State> {
  public state = {
    selectedSpaces: [],
    spaces: [],
    loading: true,
    error: null,
  };

  public componentDidMount() {
    this.loadGrid();
  }

  public render() {
    return (
      <EuiPage>
        <EuiPageContent>
          <EuiFlexGroup justifyContent={'spaceBetween'}>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h1>Spaces</h1>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{this.getPrimaryActionButton()}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size={'xl'} />

          <EuiInMemoryTable
            itemId={'id'}
            items={this.state.spaces}
            columns={this.getColumnConfig()}
            selection={{
              selectable: (space: Space) => !isReservedSpace(space),
              onSelectionChange: this.onSelectionChange,
            }}
            pagination={true}
            search={true}
            loading={this.state.loading}
            message={this.state.loading ? 'loading...' : undefined}
          />
        </EuiPageContent>
      </EuiPage>
    );
  }

  public getPrimaryActionButton() {
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
      <EuiButton
        fill
        onClick={() => {
          window.location.hash = `#/management/spaces/create`;
        }}
      >
        Create new space
      </EuiButton>
    );
  }

  public loadGrid = () => {
    const { spacesManager } = this.props;

    this.setState({
      loading: true,
      selectedSpaces: [],
      spaces: [],
    });

    const setSpaces = (spaces: Space[]) => {
      this.setState({
        loading: false,
        spaces,
      });
    };

    spacesManager
      .getSpaces()
      .then(spaces => {
        setSpaces(spaces);
      })
      .catch(error => {
        this.setState({
          loading: false,
          error,
        });
      });
  };

  public getColumnConfig() {
    return [
      {
        field: 'name',
        name: 'Space',
        sortable: true,
        render: (value: string, record: Space) => {
          return (
            <EuiLink
              onClick={() => {
                window.location.hash = `#/management/spaces/edit/${encodeURIComponent(record.id)}`;
              }}
            >
              {value}
            </EuiLink>
          );
        },
      },
      {
        field: 'id',
        name: 'Identifier',
        sortable: true,
      },
      {
        field: 'description',
        name: 'Description',
        sortable: true,
      },
    ];
  }

  public onSelectionChange = (selectedSpaces: Space[]) => {
    this.setState({ selectedSpaces });
  };
}
