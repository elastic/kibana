/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingKibana,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { getRouterLinkProps, extractQueryParams, listBreadcrumb } from '../../services';

import {
  RemoteClusterTable,
} from './remote_cluster_table';

import {
  DetailPanel,
} from './detail_panel';

const REFRESH_RATE_MS = 30000;

export const RemoteClusterList = injectI18n(
  class extends Component {
    static propTypes = {
      loadClusters: PropTypes.func.isRequired,
      refreshClusters: PropTypes.func.isRequired,
      openDetailPanel: PropTypes.func.isRequired,
      closeDetailPanel: PropTypes.func.isRequired,
      isDetailPanelOpen: PropTypes.bool,
      clusters: PropTypes.array,
      isLoading: PropTypes.bool,
      isCopyingCluster: PropTypes.bool,
      isRemovingCluster: PropTypes.bool,
    }

    static getDerivedStateFromProps(props) {
      const {
        openDetailPanel,
        closeDetailPanel,
        isDetailPanelOpen,
        history: {
          location: {
            search,
          },
        },
      } = props;

      const { cluster: clusterName } = extractQueryParams(search);

      // Show deeplinked remoteCluster whenever remoteClusters get loaded or the URL changes.
      if (clusterName != null) {
        openDetailPanel(clusterName);
      } else if (isDetailPanelOpen) {
        closeDetailPanel();
      }

      return null;
    }

    state = {};

    componentDidMount() {
      this.props.loadClusters();
      this.interval = setInterval(this.props.refreshClusters, REFRESH_RATE_MS);
      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb ]);
    }

    componentWillUnmount() {
      clearInterval(this.interval);
    }

    getHeaderSection() {
      return (
        <EuiPageContentHeaderSection>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterListTitle"
                defaultMessage="Remote clusters"
              />
            </h1>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      );
    }

    renderBlockingAction() {
      const { isCopyingCluster, isRemovingCluster } = this.props;

      if (isCopyingCluster || isRemovingCluster) {
        return (
          <EuiOverlayMask>
            <EuiLoadingKibana size="xl"/>
          </EuiOverlayMask>
        );
      }

      return null;
    }

    renderNoPermission() {
      const { intl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterList.noPermissionTitle',
        defaultMessage: 'Permission error',
      });
      return (
        <Fragment>
          {this.getHeaderSection()}
          <EuiSpacer size="m" />
          <EuiCallOut
            title={title}
            color="warning"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.noPermissionText"
              defaultMessage="You do not have permission to view or add remote clusters."
            />
          </EuiCallOut>
        </Fragment>
      );
    }

    renderError(error) {
      // We can safely depend upon the shape of this error coming from Angular $http, because we
      // handle unexpected error shapes in the API action.
      const {
        statusCode,
        error: errorString,
      } = error.data;

      const { intl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterList.loadingErrorTitle',
        defaultMessage: 'Error loading remote clusters',
      });
      return (
        <Fragment>
          {this.getHeaderSection()}
          <EuiSpacer size="m" />
          <EuiCallOut
            title={title}
            color="danger"
            iconType="alert"
          >
            {statusCode} {errorString}
          </EuiCallOut>
        </Fragment>
      );
    }

    renderEmpty() {
      return (
        <EuiEmptyPrompt
          iconType="managementApp"
          title={(
            <h1>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.emptyPromptTitle"
                defaultMessage="Add your first remote cluster"
              />
            </h1>
          )}
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterList.emptyPromptDescription"
                  defaultMessage="Remote clusters create a uni-directional connection from your
                    local cluster to other clusters."
                />
              </p>
            </Fragment>
          }
          actions={
            <EuiButton
              {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/add`)}
              fill
              iconType="plusInCircle"
            >
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.emptyPrompt.connectButtonLabel"
                defaultMessage="Add a remote cluster"
              />
            </EuiButton>
          }
        />
      );
    }

    renderList() {
      const { isLoading, clusters } = this.props;

      let table;

      if (isLoading) {
        table = (
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText>
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterList.loadingTitle"
                    defaultMessage="Loading remote clusters..."
                  />
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      } else {
        table = <RemoteClusterTable clusters={clusters} />;
      }

      return (
        <Fragment>
          <EuiPageContentHeader>
            {this.getHeaderSection()}

            <EuiPageContentHeaderSection>
              <EuiButton
                {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/add`)}
                fill
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterList.connectButtonLabel"
                  defaultMessage="Add a remote cluster"
                />
              </EuiButton>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>

          {table}

          <DetailPanel />
        </Fragment>
      );
    }

    render() {
      const { isLoading, clusters, clusterLoadError } = this.props;

      let content;

      if (clusterLoadError) {
        if (clusterLoadError.status === 403) {
          content = this.renderNoPermission();
        } else {
          content = this.renderError(clusterLoadError);
        }
      } else if (!isLoading && !clusters.length) {
        content = this.renderEmpty();
      } else {
        content = this.renderList();
      }

      return (
        <EuiPageBody>
          <EuiPageContent
            horizontalPosition="center"
          >
            {content}

            {this.renderBlockingAction()}
          </EuiPageContent>
        </EuiPageBody>
      );
    }
  }
);
