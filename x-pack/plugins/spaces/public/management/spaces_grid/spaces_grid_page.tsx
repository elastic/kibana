/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  type EuiBasicTableColumn,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { Component, lazy, Suspense } from 'react';

import type {
  ApplicationStart,
  Capabilities,
  NotificationsStart,
  ScopedHistory,
} from '@kbn/core/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import { addSpaceIdToPath, type Space } from '../../../common';
import { isReservedSpace } from '../../../common';
import {
  DEFAULT_SPACE_ID,
  ENTER_SPACE_PATH,
  SOLUTION_VIEW_CLASSIC,
} from '../../../common/constants';
import { getSpacesFeatureDescription } from '../../constants';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { SpaceSolutionBadge } from '../../space_solution_badge';
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
  serverBasePath: string;
  getFeatures: FeaturesPluginStart['getFeatures'];
  capabilities: Capabilities;
  history: ScopedHistory;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  maxSpaces: number;
  allowSolutionVisibility: boolean;
}

interface State {
  spaces: Space[];
  activeSpace: Space | null;
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
      activeSpace: null,
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
          rightSideItems={
            !this.state.loading && this.canCreateSpaces()
              ? [this.getPrimaryActionButton()]
              : undefined
          }
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
        <EuiPageSection alignment="center" color="danger">
          <UnauthorizedPrompt />
        </EuiPageSection>
      );
    }

    return (
      <>
        {!this.state.loading && !this.canCreateSpaces() ? (
          <>
            <EuiCallOut title="You have reached the maximum number of allowed spaces." />
            <EuiSpacer />
          </>
        ) : undefined}
        <EuiInMemoryTable
          itemId={'id'}
          data-test-subj="spacesListTable"
          items={this.state.spaces}
          tableCaption={i18n.translate('xpack.spaces.management.spacesGridPage.tableCaption', {
            defaultMessage: 'Kibana spaces',
          })}
          rowHeader="name"
          rowProps={(item) => ({
            'data-test-subj': `spacesListTableRow-${item.id}`,
          })}
          columns={this.getColumnConfig()}
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
      </>
    );
  }

  private canCreateSpaces() {
    return this.props.maxSpaces > this.state.spaces.length;
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
    const getActiveSpace = spacesManager.getActiveSpace();

    try {
      const [spaces, activeSpace, features] = await Promise.all([
        getSpaces,
        getActiveSpace,
        getFeatures(),
      ]);
      this.setState({
        loading: false,
        spaces,
        activeSpace,
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
    const { activeSpace, features } = this.state;
    const { solution: activeSolution } = activeSpace ?? {};

    const config: Array<EuiBasicTableColumn<Space>> = [
      {
        field: 'initials',
        name: '',
        width: '50px',
        render: (_value: string, rowRecord) => {
          return (
            <Suspense fallback={<EuiLoadingSpinner />}>
              <EuiLink
                {...reactRouterNavigate(this.props.history, this.getEditSpacePath(rowRecord))}
              >
                <LazySpaceAvatar space={rowRecord} size="s" />
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
        render: (value: string, rowRecord: Space) => (
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiLink
                {...reactRouterNavigate(this.props.history, this.getEditSpacePath(rowRecord))}
                data-test-subj={`${rowRecord.id}-hyperlink`}
              >
                {value}
              </EuiLink>
            </EuiFlexItem>
            {activeSpace?.name === rowRecord.name && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary" data-test-subj={`spacesListCurrentBadge-${rowRecord.id}`}>
                  {i18n.translate('xpack.spaces.management.spacesGridPage.currentSpaceMarkerText', {
                    defaultMessage: 'current',
                  })}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        'data-test-subj': 'spacesListTableRowNameCell',
      },
      {
        field: 'description',
        name: i18n.translate('xpack.spaces.management.spacesGridPage.descriptionColumnName', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        width: '30%',
      },
    ];

    const shouldShowFeaturesColumn = !activeSolution || activeSolution === SOLUTION_VIEW_CLASSIC;
    if (shouldShowFeaturesColumn) {
      config.push({
        field: 'disabledFeatures',
        name: i18n.translate('xpack.spaces.management.spacesGridPage.featuresColumnName', {
          defaultMessage: 'Features visible',
        }),
        sortable: (space: Space) => {
          return getEnabledFeatures(features, space).length;
        },
        render: (_disabledFeatures: string[], rowRecord: Space) => {
          const enabledFeatureCount = getEnabledFeatures(features, rowRecord).length;
          if (enabledFeatureCount === features.length) {
            return (
              <FormattedMessage
                id="xpack.spaces.management.spacesGridPage.allFeaturesEnabled"
                defaultMessage="All features visible"
              />
            );
          }
          if (enabledFeatureCount === 0) {
            return (
              <EuiText color={'danger'} size="s">
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
              defaultMessage="{enabledFeatureCount} / {totalFeatureCount}"
              values={{
                enabledFeatureCount,
                totalFeatureCount: features.length,
              }}
            />
          );
        },
      });
    }

    config.push({
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
    });

    if (this.props.allowSolutionVisibility) {
      config.push({
        field: 'solution',
        name: i18n.translate('xpack.spaces.management.spacesGridPage.solutionColumnName', {
          defaultMessage: 'Solution View',
        }),
        sortable: true,
        render: (solution: Space['solution'], record: Space) => (
          <SpaceSolutionBadge solution={solution} data-test-subj={`${record.id}-solution`} />
        ),
      });
    }

    config.push({
      name: i18n.translate('xpack.spaces.management.spacesGridPage.actionsColumnName', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          isPrimary: true,
          name: i18n.translate('xpack.spaces.management.spacesGridPage.editSpaceActionName', {
            defaultMessage: `Edit`,
          }),
          description: (rowRecord) =>
            i18n.translate('xpack.spaces.management.spacesGridPage.editSpaceActionDescription', {
              defaultMessage: `Edit {spaceName}.`,
              values: { spaceName: rowRecord.name },
            }),
          type: 'icon',
          icon: 'pencil',
          color: 'primary',
          href: (rowRecord) =>
            reactRouterNavigate(this.props.history, this.getEditSpacePath(rowRecord)).href,
          onClick: (rowRecord) =>
            reactRouterNavigate(this.props.history, this.getEditSpacePath(rowRecord)).onClick,
          'data-test-subj': (rowRecord) => `${rowRecord.name}-editSpace`,
        },
        {
          isPrimary: true,
          name: i18n.translate('xpack.spaces.management.spacesGridPage.switchSpaceActionName', {
            defaultMessage: 'Switch',
          }),
          description: (rowRecord) =>
            activeSpace?.name !== rowRecord.name
              ? i18n.translate(
                  'xpack.spaces.management.spacesGridPage.switchSpaceActionDescription',
                  {
                    defaultMessage: 'Switch to {spaceName}',
                    values: { spaceName: rowRecord.name },
                  }
                )
              : i18n.translate(
                  'xpack.spaces.management.spacesGridPage.switchSpaceActionDisabledDescription',
                  {
                    defaultMessage: '{spaceName} is the current space',
                    values: { spaceName: rowRecord.name },
                  }
                ),
          type: 'icon',
          icon: 'merge',
          color: 'primary',
          href: (rowRecord: Space) =>
            addSpaceIdToPath(
              this.props.serverBasePath,
              rowRecord.id,
              `${ENTER_SPACE_PATH}?next=/app/management/kibana/spaces/`
            ),
          enabled: (rowRecord) => activeSpace?.name !== rowRecord.name,
          'data-test-subj': (rowRecord) => `${rowRecord.name}-switchSpace`,
        },
        {
          name: i18n.translate('xpack.spaces.management.spacesGridPage.deleteActionName', {
            defaultMessage: `Delete`,
          }),
          description: (rowRecord) =>
            isReservedSpace(rowRecord)
              ? i18n.translate(
                  'xpack.spaces.management.spacesGridPage.deleteActionDisabledDescription',
                  {
                    defaultMessage: `{spaceName} is reserved`,
                    values: { spaceName: rowRecord.name },
                  }
                )
              : i18n.translate('xpack.spaces.management.spacesGridPage.deleteActionDescription', {
                  defaultMessage: `Delete {spaceName}`,
                  values: { spaceName: rowRecord.name },
                }),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (rowRecord: Space) => this.onDeleteSpaceClick(rowRecord),
          enabled: (rowRecord: Space) => !isReservedSpace(rowRecord),
          'data-test-subj': (rowRecord) => `${rowRecord.name}-deleteSpace`,
        },
      ],
    });

    return config;
  }

  private getEditSpacePath = (space: Space) => `edit/${encodeURIComponent(space.id)}`;

  private onDeleteSpaceClick = (space: Space) => {
    this.setState({
      selectedSpace: space,
      showConfirmDeleteModal: true,
    });
  };
}
