/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPage,
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

import { extractQueryParams } from '../../services';

import {
  RemoteClusterTable,
} from './remote_cluster_table';

import {
  DetailPanel,
} from './detail_panel';

const REFRESH_RATE_MS = 30000;

export class RemoteClusterListUi extends Component {
  static propTypes = {
    loadRemoteClusters: PropTypes.func,
    refreshRemoteClusters: PropTypes.func,
    openDetailPanel: PropTypes.func,
    remoteClusters: PropTypes.array,
    isLoading: PropTypes.bool,
  }

  static getDerivedStateFromProps(props) {
    const {
      openDetailPanel,
      history: {
        location: {
          search,
        },
      },
    } = props;

    const { remoteCluster: remoteClusterId } = extractQueryParams(search);

    // Show deeplinked remoteCluster whenever remoteClusters get loaded or the URL changes.
    if (remoteClusterId != null) {
      openDetailPanel(remoteClusterId);
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {};

    props.loadRemoteClusters();
  }

  componentDidMount() {
    this.interval = setInterval(this.props.refreshRemoteClusters, REFRESH_RATE_MS);
  }

  componentWillUnmount() {
    clearInterval(this.interval);

    // Close the panel, otherwise it will default to already being open when we navigate back to
    // this page.
    this.props.closeDetailPanel();
  }

  connectRemoteCluster() {
    // TODO: Show modal and update query string to enable deep-linking.
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
              defaultMessage="Connect your first remote cluster"
            />
          </h1>
        )}
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.emptyPromptDescription"
                defaultMessage="Remote clusters create a uni-directional connection between your local cluster and other clusters."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            onClick={this.connectRemoteCluster}
            fill
            iconType="plusInCircle"
          >
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterList.emptyPrompt.connectButtonLabel"
              defaultMessage="Connect a remote cluster"
            />
          </EuiButton>
        }
      />
    );
  }

  renderList() {
    const { isLoading, remoteClusters } = this.props;

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
      table = <RemoteClusterTable remoteClusters={remoteClusters} />;
    }

    return (
      <Fragment>
        <EuiPageContentHeader>
          {this.getHeaderSection()}

          <EuiPageContentHeaderSection>
            <EuiButton fill onClick={this.connectRemoteCluster}>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterList.connectButtonLabel"
                defaultMessage="Connect a remote cluster"
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
    const { isLoading, remoteClusters, remoteClusterLoadError } = this.props;

    let content;

    if (remoteClusterLoadError) {
      if (remoteClusterLoadError.status === 403) {
        content = this.renderNoPermission();
      } else {
        content = this.renderError(remoteClusterLoadError);
      }
    } else if (!isLoading && !remoteClusters.length) {
      content = this.renderEmpty();
    } else {
      content = this.renderList();
    }

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            {content}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const RemoteClusterList = injectI18n(RemoteClusterListUi);
