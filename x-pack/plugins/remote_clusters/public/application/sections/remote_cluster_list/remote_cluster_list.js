/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

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
import { getRouterLinkProps, extractQueryParams } from '../../services';
import { setBreadcrumbs } from '../../services/breadcrumb';

import { RemoteClusterTable } from './remote_cluster_table';

import { DetailPanel } from './detail_panel';

const REFRESH_RATE_MS = 30000;

export class RemoteClusterList extends Component {
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
  };

  componentDidUpdate() {
    const {
      openDetailPanel,
      closeDetailPanel,
      isDetailPanelOpen,
      history: {
        location: { search },
      },
    } = this.props;

    const { cluster: clusterName } = extractQueryParams(search);

    // Show deeplinked remoteCluster whenever remoteClusters get loaded or the URL changes.
    if (clusterName != null) {
      openDetailPanel(clusterName);
    } else if (isDetailPanelOpen) {
      closeDetailPanel();
    }
  }

  componentDidMount() {
    this.props.loadClusters();
    this.interval = setInterval(this.props.refreshClusters, REFRESH_RATE_MS);
    setBreadcrumbs('home');
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  getHeaderSection(isAuthorized) {
    return (
      <Fragment>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterListTitle"
                  defaultMessage="Remote Clusters"
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>

          {isAuthorized && (
            <EuiPageContentHeaderSection>
              <EuiButton
                {...getRouterLinkProps(`${CRUD_APP_BASE_PATH}/add`)}
                fill
                data-test-subj="remoteClusterCreateButton"
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterList.connectButtonLabel"
                  defaultMessage="Add a remote cluster"
                />
              </EuiButton>
            </EuiPageContentHeaderSection>
          )}
        </EuiPageContentHeader>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  renderBlockingAction() {
    const { isCopyingCluster, isRemovingCluster } = this.props;

    if (isCopyingCluster || isRemovingCluster) {
      return (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl" />
        </EuiOverlayMask>
      );
    }

    return null;
  }

  renderNoPermission() {
    const title = i18n.translate('xpack.remoteClusters.remoteClusterList.noPermissionTitle', {
      defaultMessage: 'Permission error',
    });
    return (
      <EuiCallOut title={title} color="warning" iconType="help">
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterList.noPermissionText"
          defaultMessage="You do not have permission to view or add remote clusters."
        />
      </EuiCallOut>
    );
  }

  renderError(error) {
    // We can safely depend upon the shape of this error coming from http service, because we
    // handle unexpected error shapes in the API action.
    const { statusCode, error: errorString } = error.body;

    const title = i18n.translate('xpack.remoteClusters.remoteClusterList.loadingErrorTitle', {
      defaultMessage: 'Error loading remote clusters',
    });
    return (
      <EuiCallOut title={title} color="danger" iconType="alert">
        {statusCode} {errorString}
      </EuiCallOut>
    );
  }

  renderEmpty() {
    return (
      <EuiEmptyPrompt
        data-test-subj="remoteClusterListEmptyPrompt"
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.emptyPromptTitle"
              defaultMessage="Add your first remote cluster"
            />
          </h1>
        }
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
            data-test-subj="remoteClusterEmptyPromptCreateButton"
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

  renderLoading() {
    return (
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="center"
        gutterSize="s"
        data-test-subj="remoteClustersTableLoading"
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
  }

  renderList() {
    const { clusters } = this.props;

    return (
      <Fragment>
        <RemoteClusterTable clusters={clusters} />
        <DetailPanel />
      </Fragment>
    );
  }

  render() {
    const { isLoading, clusters, clusterLoadError } = this.props;
    const isEmpty = !isLoading && !clusters.length;
    const isAuthorized = !clusterLoadError || clusterLoadError.status !== 403;
    const isHeaderVisible = clusterLoadError || !isEmpty;

    let content;

    if (clusterLoadError) {
      if (!isAuthorized) {
        content = this.renderNoPermission();
      } else {
        content = this.renderError(clusterLoadError);
      }
    } else if (isEmpty) {
      content = this.renderEmpty();
    } else if (isLoading) {
      content = this.renderLoading();
    } else {
      content = this.renderList();
    }

    return (
      <EuiPageBody>
        <EuiPageContent>
          {isHeaderVisible && this.getHeaderSection(isAuthorized)}
          {content}
          {this.renderBlockingAction()}
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}
