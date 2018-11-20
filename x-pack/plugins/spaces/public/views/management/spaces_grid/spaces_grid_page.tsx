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
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
// @ts-ignore
import { toastNotifications } from 'ui/notify';

import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import { UserProfile } from '../../../../../xpack_main/public/services/user_profile';
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
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  spaces: Space[];
  loading: boolean;
  showConfirmDeleteModal: boolean;
  selectedSpace: Space | null;
  error: Error | null;
}

<<<<<<< HEAD
export class SpacesGridPage extends Component<Props, State> {
=======
class SpacesGridPageUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    if (!this.props.userProfile.hasCapability('manageSpaces')) {
      return <UnauthorizedPrompt />;
    }

    return (
      <Fragment>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiText>
<<<<<<< HEAD
              <h1>Spaces</h1>
=======
              <h1>
                <FormattedMessage
                  id="xpack.spaces.management.spacesGridPage.spacesTitle"
                  defaultMessage="Spaces"
                />
              </h1>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
              placeholder: 'Search',
            },
          }}
          loading={this.state.loading}
          message={this.state.loading ? 'loading...' : undefined}
=======
              placeholder: intl.formatMessage({
                id: 'xpack.spaces.management.spacesGridPage.searchPlaceholder',
                defaultMessage: 'Search',
              }),
            },
          }}
          loading={this.state.loading}
          message={
            this.state.loading ? (
              <FormattedMessage
                id="xpack.spaces.management.spacesGridPage.loadingTitle"
                defaultMessage="loading…"
              />
            ) : (
              undefined
            )
          }
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        Create space
=======
        <FormattedMessage
          id="xpack.spaces.management.spacesGridPage.createSpaceButtonLabel"
          defaultMessage="Create space"
        />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    const { spacesManager, spacesNavState } = this.props;

    const space = this.state.selectedSpace;

    if (!space) {
      return;
    }

    try {
      await spacesManager.deleteSpace(space);
    } catch (error) {
      const { message: errorMessage = '' } = error.data || {};

<<<<<<< HEAD
      toastNotifications.addDanger(`Error deleting space: ${errorMessage}`);
=======
      toastNotifications.addDanger(
        intl.formatMessage(
          {
            id: 'xpack.spaces.management.spacesGridPage.errorDeletingSpaceErrorMessage',
            defaultMessage: 'Error deleting space: {errorMessage}',
          },
          {
            errorMessage,
          }
        )
      );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    }

    this.setState({
      showConfirmDeleteModal: false,
    });

    this.loadGrid();

<<<<<<< HEAD
    const message = `Deleted "${space.name}" space.`;
=======
    const message = intl.formatMessage(
      {
        id: 'xpack.spaces.management.spacesGridPage.spaceSuccessfullyDeletedNotificationMessage',
        defaultMessage: 'Deleted "{spaceName}" space.',
      },
      {
        spaceName: space.name,
      }
    );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

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
<<<<<<< HEAD
=======
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        name: 'Space',
=======
        name: intl.formatMessage({
          id: 'xpack.spaces.management.spacesGridPage.spaceColumnName',
          defaultMessage: 'Space',
        }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        name: 'Identifier',
=======
        name: intl.formatMessage({
          id: 'xpack.spaces.management.spacesGridPage.identifierColumnName',
          defaultMessage: 'Identifier',
        }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        sortable: true,
      },
      {
        field: 'description',
<<<<<<< HEAD
        name: 'Description',
        sortable: true,
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Edit',
            description: 'Edit this space.',
=======
        name: intl.formatMessage({
          id: 'xpack.spaces.management.spacesGridPage.descriptionColumnName',
          defaultMessage: 'Description',
        }),
        sortable: true,
      },
      {
        name: intl.formatMessage({
          id: 'xpack.spaces.management.spacesGridPage.actionsColumnName',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: intl.formatMessage({
              id: 'xpack.spaces.management.spacesGridPage.editSpaceActionName',
              defaultMessage: 'Edit',
            }),
            description: intl.formatMessage({
              id: 'xpack.spaces.management.spacesGridPage.editSpaceActionDescription',
              defaultMessage: 'Edit this space.',
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            onClick: this.onEditSpaceClick,
            type: 'icon',
            icon: 'pencil',
            color: 'primary',
          },
          {
            available: (record: Space) => !isReservedSpace(record),
<<<<<<< HEAD
            name: 'Delete',
            description: 'Delete this space.',
=======
            name: intl.formatMessage({
              id: 'xpack.spaces.management.spacesGridPage.deleteActionName',
              defaultMessage: 'Delete',
            }),
            description: intl.formatMessage({
              id: 'xpack.spaces.management.spacesGridPage.deleteThisSpaceActionDescription',
              defaultMessage: 'Delete this space.',
            }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======

export const SpacesGridPage = injectI18n(SpacesGridPageUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
