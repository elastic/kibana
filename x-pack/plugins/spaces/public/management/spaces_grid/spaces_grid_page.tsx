/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { Component, lazy, Suspense } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  ApplicationStart,
  Capabilities,
  NotificationsStart,
  ScopedHistory,
} from 'src/core/public';

import { reactRouterNavigate } from '../../../../../../src/plugins/kibana_react/public';
import type { FeaturesPluginStart, KibanaFeature } from '../../../../features/public';
import type { Space } from '../../../common';
import { isReservedSpace } from '../../../common';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { getSpacesFeatureDescription } from '../../constants';
import { getSpaceAvatarComponent } from '../../space_avatar';
import type { SpacesManager } from '../../spaces_manager';
import { ConfirmDeleteModal, UnauthorizedPrompt } from '../components';
import { getEnabledFeatures } from '../lib/feature_utils';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  spacesManager: SpacesManager;
  notifications: NotificationsStart;
  getFeatures: FeaturesPluginStart['getFeatures'];
  capabilities: Capabilities;
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

interface State {
  spaces: Space[];
  features: KibanaFeature[];
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
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <FormattedMessage
              id="xpack.spaces.management.spacesGridPage.spacesTitle"
              defaultMessage="Spaces"
            />
          }
          description={getSpacesFeatureDescription()}
          rightSideItems={[this.getPrimaryActionButton()]}
        />
        <EuiSpacer size="l" />
        {this.getPageContent()}
        {this.getConfirmDeleteModal()}
      </div>
    );
  }

  public getPageContent() {
    if (!this.props.capabilities.spaces.manage) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
          <UnauthorizedPrompt />
        </EuiPageContent>
      );
    }

    return (
      <EuiInMemoryTable
        itemId={'id'}
        items={this.state.spaces}
        tableCaption={i18n.translate('xpack.spaces.management.spacesGridPage.tableCaption', {
          defaultMessage: 'Kibana spaces',
        })}
        rowHeader="name"
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
    );
  }

  public getPrimaryActionButton() {
    return (
      <EuiButton
        fill
        iconType="plusInCircleFilled"
        {...reactRouterNavigate(this.props.history, '/create')}
        data-test-subj="createSpace"
      >
        <FormattedMessage
          id="xpack.spaces.management.spacesGridPage.createSpaceButtonLabel"
          defaultMessage="Create space"
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
        onSuccess={() => {
          this.setState({
            showConfirmDeleteModal: false,
          });
          this.loadGrid();
        }}
      />
    );
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
        render: (value: string, record: Space) => {
          return (
            <Suspense fallback={<EuiLoadingSpinner />}>
              <EuiLink {...reactRouterNavigate(this.props.history, this.getEditSpacePath(record))}>
                <LazySpaceAvatar space={record} size="s" />
              </EuiLink>
            </Suspense>
          );
        },
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
                data-test-subj={`${record.name}-editSpace`}
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
                data-test-subj={`${record.name}-deleteSpace`}
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
