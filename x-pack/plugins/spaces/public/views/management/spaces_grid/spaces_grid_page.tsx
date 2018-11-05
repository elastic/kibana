/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiInMemoryTable,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
// @ts-ignore
import { toastNotifications } from 'ui/notify';

import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import { UserProfile } from '../../../../../xpack_main/common/user_profile';
import { isReservedSpace } from '../../../../common';
import { Space } from '../../../../common/model/space';
import { SpaceAvatar } from '../../../components';
import { SpacesManager } from '../../../lib/spaces_manager';
import { ConfirmDeleteModal } from '../components/confirm_delete_modal';
import { SecureSpaceMessage } from '../components/secure_space_message';
import { UnauthorizedPrompt } from '../components/unauthorized_prompt';

interface Props {
  spacesManager: SpacesManager;
  spacesNavState: SpacesNavState;
  userProfile: UserProfile;
}

interface State {
  spaces: Space[];
  loading: boolean;
  showConfirmDeleteModal: boolean;
  selectedSpace: Space | null;
  error: Error | null;
}

export class SpacesGridPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      spaces: [],
      loading: true,
      showConfirmDeleteModal: false,
      selectedSpace: null,
      error: null,
    };
  }

  public componentDidMount() {
    this.loadGrid();
  }

  public render() {
    return (
      <EuiPage restrictWidth className="spcGridPage">
        <EuiPageBody>
          <EuiPageContent horizontalPosition="center">{this.getPageContent()}</EuiPageContent>
          <SecureSpaceMessage userProfile={this.props.userProfile} />
        </EuiPageBody>
        {this.getConfirmDeleteModal()}
      </EuiPage>
    );
  }

  public getPageContent() {
    if (!this.props.userProfile.hasCapability('manageSpaces')) {
      return <UnauthorizedPrompt />;
    }

    return (
      <Fragment>
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
          hasActions
          pagination={true}
          search={{
            box: {
              placeholder: 'Search',
            },
          }}
          loading={this.state.loading}
          message={this.state.loading ? 'loading...' : undefined}
        />
      </Fragment>
    );
  }

  public getPrimaryActionButton() {
    return (
      <EuiButton
        fill
        onClick={() => {
          window.location.hash = `#/management/spaces/create`;
        }}
      >
        Create space
      </EuiButton>
    );
  }

  public getConfirmDeleteModal = () => {
    if (!this.state.showConfirmDeleteModal || !this.state.selectedSpace) {
      return null;
    }

    const { spacesNavState, spacesManager } = this.props;

    return (
      <ConfirmDeleteModal
        space={this.state.selectedSpace}
        spacesNavState={spacesNavState}
        spacesManager={spacesManager}
        onCancel={() => {
          this.setState({
            showConfirmDeleteModal: false,
          });
        }}
        onConfirm={this.deleteSpace}
      />
    );
  };

  public deleteSpace = async () => {
    const { spacesManager, spacesNavState } = this.props;

    const space = this.state.selectedSpace;

    if (!space) {
      return;
    }

    try {
      await spacesManager.deleteSpace(space);
    } catch (error) {
      const { message: errorMessage = '' } = error.data || {};

      toastNotifications.addDanger(`Error deleting space: ${errorMessage}`);
    }

    this.setState({
      showConfirmDeleteModal: false,
    });

    this.loadGrid();

    const message = `Deleted "${space.name}" space.`;

    toastNotifications.addSuccess(message);

    spacesNavState.refreshSpacesList();
  };

  public loadGrid = () => {
    const { spacesManager } = this.props;

    this.setState({
      loading: true,
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
        name: '',
        width: '50px',
        sortable: true,
        render: (value: string, record: Space) => {
          return (
            <EuiLink
              onClick={() => {
                this.onEditSpaceClick(record);
              }}
            >
              <SpaceAvatar space={record} size="s" />
            </EuiLink>
          );
        },
      },
      {
        field: 'name',
        name: 'Space',
        sortable: true,
        render: (value: string, record: Space) => {
          return (
            <EuiLink
              onClick={() => {
                this.onEditSpaceClick(record);
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
      {
        name: 'Actions',
        actions: [
          {
            name: 'Edit',
            description: 'Edit this space.',
            onClick: this.onEditSpaceClick,
            type: 'icon',
            icon: 'pencil',
            color: 'primary',
          },
          {
            available: (record: Space) => !isReservedSpace(record),
            name: 'Delete',
            description: 'Delete this space.',
            onClick: this.onDeleteSpaceClick,
            type: 'icon',
            icon: 'trash',
            color: 'danger',
          },
        ],
      },
    ];
  }

  private onEditSpaceClick = (space: Space) => {
    window.location.hash = `#/management/spaces/edit/${encodeURIComponent(space.id)}`;
  };

  private onDeleteSpaceClick = (space: Space) => {
    this.setState({
      selectedSpace: space,
      showConfirmDeleteModal: true,
    });
  };
}
