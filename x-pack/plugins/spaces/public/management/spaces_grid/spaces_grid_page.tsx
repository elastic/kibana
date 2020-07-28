/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart, Capabilities, NotificationsStart, ScopedHistory } from 'src/core/public';
import { Feature, FeaturesPluginStart } from '../../../../features/public';
import { isReservedSpace } from '../../../common';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { Space } from '../../../common/model/space';
import { SpaceAvatar } from '../../space_avatar';
import { getSpacesFeatureDescription } from '../../constants';
import { SpacesManager } from '../..//spaces_manager';
import { ConfirmDeleteModal } from '../components/confirm_delete_modal';
import { SecureSpaceMessage } from '../components/secure_space_message';
import { UnauthorizedPrompt } from '../components/unauthorized_prompt';
import { getEnabledFeatures } from '../lib/feature_utils';
import { reactRouterNavigate } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  spacesManager: SpacesManager;
  notifications: NotificationsStart;
  getFeatures: FeaturesPluginStart['getFeatures'];
  capabilities: Capabilities;
  securityEnabled: boolean;
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

interface State {
  spaces: Space[];
  features: Feature[];
  loading: boolean;
  showConfirmDeleteModal: boolean;
  selectedSpace: Space | null;
}

export class SpacesGridPage extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      spaces: [],
      features: [],
      loading: true,
      showConfirmDeleteModal: false,
      selectedSpace: null,
    };
  }

  public componentDidMount() {
    if (this.props.capabilities.spaces.manage) {
      this.loadGrid();
    }
  }

  public render() {
    return (
      <div className="spcGridPage" data-test-subj="spaces-grid-page">
        <EuiPageContent horizontalPosition="center">{this.getPageContent()}</EuiPageContent>
        {this.props.securityEnabled && (
          <SecureSpaceMessage getUrlForApp={this.props.getUrlForApp} />
        )}
        {this.getConfirmDeleteModal()}
      </div>
    );
  }

  public getPageContent() {
    if (!this.props.capabilities.spaces.manage) {
      return <UnauthorizedPrompt />;
    }

    return (
      <Fragment>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="xpack.spaces.management.spacesGridPage.spacesTitle"
                  defaultMessage="Spaces"
                />
              </h1>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>{getSpacesFeatureDescription()}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{this.getPrimaryActionButton()}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />

        <EuiInMemoryTable
          itemId={'id'}
          items={this.state.spaces}
          columns={this.getColumnConfig()}
          hasActions
          pagination={true}
          sorting={true}
          search={{
            box: {
              placeholder: i18n.translate(
                'xpack.spaces.management.spacesGridPage.searchPlaceholder',
                {
                  defaultMessage: 'Search',
                }
              ),
            },
          }}
          loading={this.state.loading}
          message={
            this.state.loading ? (
              <FormattedMessage
                id="xpack.spaces.management.spacesGridPage.loadingTitle"
                defaultMessage="loading…"
              />
            ) : undefined
          }
        />
      </Fragment>
    );
  }

  public getPrimaryActionButton() {
    return (
      <EuiButton fill {...reactRouterNavigate(this.props.history, '/create')}>
        <FormattedMessage
          id="xpack.spaces.management.spacesGridPage.createSpaceButtonLabel"
          defaultMessage="Create a space"
        />
      </EuiButton>
    );
  }

  public getConfirmDeleteModal = () => {
    if (!this.state.showConfirmDeleteModal || !this.state.selectedSpace) {
      return null;
    }

    const { spacesManager } = this.props;

    return (
      <ConfirmDeleteModal
        space={this.state.selectedSpace}
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
    const { spacesManager } = this.props;

    const space = this.state.selectedSpace;

    if (!space) {
      return;
    }

    this.setState({
      showConfirmDeleteModal: false,
    });

    try {
      await spacesManager.deleteSpace(space);
    } catch (error) {
      const { message: errorMessage = '' } = error.data || error.body || {};

      this.props.notifications.toasts.addDanger(
        i18n.translate('xpack.spaces.management.spacesGridPage.errorDeletingSpaceErrorMessage', {
          defaultMessage: 'Error deleting space: {errorMessage}',
          values: {
            errorMessage,
          },
        })
      );
      return;
    }

    this.loadGrid();

    const message = i18n.translate(
      'xpack.spaces.management.spacesGridPage.spaceSuccessfullyDeletedNotificationMessage',
      {
        defaultMessage: 'Deleted "{spaceName}" space.',
        values: { spaceName: space.name },
      }
    );

    this.props.notifications.toasts.addSuccess(message);
  };

  public loadGrid = async () => {
    const { spacesManager, getFeatures, notifications } = this.props;

    this.setState({
      loading: true,
      spaces: [],
      features: [],
    });

    const getSpaces = spacesManager.getSpaces();

    try {
      const [spaces, features] = await Promise.all([getSpaces, getFeatures()]);
      this.setState({
        loading: false,
        spaces,
        features,
      });
    } catch (error) {
      this.setState({
        loading: false,
      });
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.spaces.management.spacesGridPage.errorTitle', {
          defaultMessage: 'Error loading spaces',
        }),
      });
    }
  };

  public getColumnConfig() {
    return [
      {
        field: 'initials',
        name: '',
        width: '50px',
        render: (value: string, record: Space) => (
          <EuiLink {...reactRouterNavigate(this.props.history, this.getEditSpacePath(record))}>
            <SpaceAvatar space={record} size="s" />
          </EuiLink>
        ),
      },
      {
        field: 'name',
        name: i18n.translate('xpack.spaces.management.spacesGridPage.spaceColumnName', {
          defaultMessage: 'Space',
        }),
        sortable: true,
        render: (value: string, record: Space) => (
          <EuiLink {...reactRouterNavigate(this.props.history, this.getEditSpacePath(record))}>
            {value}
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('xpack.spaces.management.spacesGridPage.descriptionColumnName', {
          defaultMessage: 'Description',
        }),
        sortable: true,
      },
      {
        field: 'disabledFeatures',
        name: i18n.translate('xpack.spaces.management.spacesGridPage.featuresColumnName', {
          defaultMessage: 'Features',
        }),
        sortable: (space: Space) => {
          return getEnabledFeatures(this.state.features, space).length;
        },
        render: (disabledFeatures: string[], record: Space) => {
          const enabledFeatureCount = getEnabledFeatures(this.state.features, record).length;
          if (enabledFeatureCount === this.state.features.length) {
            return (
              <FormattedMessage
                id="xpack.spaces.management.spacesGridPage.allFeaturesEnabled"
                defaultMessage="All features visible"
              />
            );
          }
          if (enabledFeatureCount === 0) {
            return (
              <EuiText color={'danger'}>
                <FormattedMessage
                  id="xpack.spaces.management.spacesGridPage.noFeaturesEnabled"
                  defaultMessage="No features visible"
                />
              </EuiText>
            );
          }
          return (
            <FormattedMessage
              id="xpack.spaces.management.spacesGridPage.someFeaturesEnabled"
              defaultMessage="{enabledFeatureCount} / {totalFeatureCount} features visible"
              values={{
                enabledFeatureCount,
                totalFeatureCount: this.state.features.length,
              }}
            />
          );
        },
      },
      {
        field: 'id',
        name: i18n.translate('xpack.spaces.management.spacesGridPage.identifierColumnName', {
          defaultMessage: 'Identifier',
        }),
        sortable: true,
        render(id: string) {
          if (id === DEFAULT_SPACE_ID) {
            return '';
          }
          return id;
        },
      },
      {
        name: i18n.translate('xpack.spaces.management.spacesGridPage.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (record: Space) => (
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.spaces.management.spacesGridPage.editSpaceActionName',
                  {
                    defaultMessage: `Edit {spaceName}.`,
                    values: { spaceName: record.name },
                  }
                )}
                color={'primary'}
                iconType={'pencil'}
                {...reactRouterNavigate(this.props.history, this.getEditSpacePath(record))}
              />
            ),
          },
          {
            available: (record: Space) => !isReservedSpace(record),
            render: (record: Space) => (
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.spaces.management.spacesGridPage.deleteActionName',
                  {
                    defaultMessage: `Delete {spaceName}.`,
                    values: { spaceName: record.name },
                  }
                )}
                color={'danger'}
                iconType={'trash'}
                onClick={() => this.onDeleteSpaceClick(record)}
              />
            ),
          },
        ],
      },
    ];
  }

  private getEditSpacePath = (space: Space) => `edit/${encodeURIComponent(space.id)}`;

  private onDeleteSpaceClick = (space: Space) => {
    this.setState({
      selectedSpace: space,
      showConfirmDeleteModal: true,
    });
  };
}
