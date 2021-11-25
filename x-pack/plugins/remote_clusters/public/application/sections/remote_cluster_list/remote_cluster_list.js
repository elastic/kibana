/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiOverlayMask,
  EuiPageContent,
  EuiSpacer,
  EuiPageHeader,
} from '@elastic/eui';

import { remoteClustersUrl } from '../../services/documentation';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import { extractQueryParams, SectionLoading } from '../../../shared_imports';
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

  renderBlockingAction() {
    const { isCopyingCluster, isRemovingCluster } = this.props;

    if (isCopyingCluster || isRemovingCluster) {
      return (
        <EuiOverlayMask>
          <EuiLoadingLogo logo="logoKibana" size="xl" />
        </EuiOverlayMask>
      );
    }

    return null;
  }

  renderNoPermission() {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h2>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.noPermissionTitle"
                defaultMessage="Permission error"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.noPermissionText"
                defaultMessage="You do not have permission to view or add remote clusters."
              />
            </p>
          }
        />
      </EuiPageContent>
    );
  }

  renderError(error) {
    // We can safely depend upon the shape of this error coming from http service, because we
    // handle unexpected error shapes in the API action.
    const { statusCode, error: errorString } = error.body;

    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h2>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.loadingErrorTitle"
                defaultMessage="Error loading remote clusters"
              />
            </h2>
          }
          body={
            <p>
              {statusCode} {errorString}
            </p>
          }
        />
      </EuiPageContent>
    );
  }

  renderEmpty() {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <EuiEmptyPrompt
          data-test-subj="remoteClusterListEmptyPrompt"
          iconType="managementApp"
          title={
            <h2>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.emptyPromptTitle"
                defaultMessage="Add your first remote cluster"
              />
            </h2>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.emptyPromptDescription"
                defaultMessage="Remote clusters create a uni-directional connection from your
                local cluster to other clusters."
              />
            </p>
          }
          actions={
            <EuiButton
              {...reactRouterNavigate(this.props.history, '/add')}
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
      </EuiPageContent>
    );
  }

  renderLoading() {
    return (
      <EuiPageContent
        verticalPosition="center"
        horizontalPosition="center"
        color="subdued"
        data-test-subj="remoteClustersTableLoading"
      >
        <SectionLoading>
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterList.loadingTitle"
            defaultMessage="Loading remote clusters…"
          />
        </SectionLoading>
      </EuiPageContent>
    );
  }

  renderList() {
    const { clusters } = this.props;

    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterListTitle"
              defaultMessage="Remote Clusters"
            />
          }
          rightSideItems={[
            <EuiButtonEmpty
              href={remoteClustersUrl}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.remoteClusters.remoteClustersDocsLinkText"
                defaultMessage="Remote Clusters docs"
              />
            </EuiButtonEmpty>,
          ]}
        />

        <EuiSpacer size="l" />

        <RemoteClusterTable clusters={clusters} />
        <DetailPanel />
      </>
    );
  }

  render() {
    const { isLoading, clusters, clusterLoadError } = this.props;
    const isEmpty = !isLoading && !clusters.length;
    const isAuthorized = !clusterLoadError || clusterLoadError.status !== 403;

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
      <>
        {content}
        {this.renderBlockingAction()}
      </>
    );
  }
}
