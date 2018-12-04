/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiBreadcrumbs,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiTitle,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';

import routing from '../../services/routing';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../../common/constants';
import { AutoFollowPatternForm, RemoteClustersProvider, SectionLoading, SectionError } from '../../components';

class AutoFollowPatternAddUi extends PureComponent {
  static propTypes = {
    saveAutoFollowPattern: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  renderEmptyClusters() {
    const { intl } = this.props;
    const title = intl.formatMessage({
      id: 'xpack.crossClusterReplication.autoFollowPatternCreateForm.emptyRemoteClustersCallOutTitle',
      defaultMessage: 'No remote cluster found'
    });

    return (
      <Fragment>
        <EuiCallOut
          title={title}
          color="warning"
          iconType="cross"
        >
          <p>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternCreateForm.emptyRemoteClustersCallOutDescription"
              defaultMessage="Auto-follow patterns capture indices on remote clusters. Add a remote cluster before you create an auto-follow pattern." //eslint-disable-line max-len
            />
          </p>

          <EuiButton
            {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS)}
            iconType="plusInCircle"
            color="warning"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternCreateForm.addRemoteClusterButtonLabel"
              defaultMessage="Add remote cluster"
            />
          </EuiButton>
        </EuiCallOut>
      </Fragment>
    );
  }

  renderNoConnectedCluster() {
    const { intl } = this.props;
    const title = intl.formatMessage({
      id: 'xpack.crossClusterReplication.autoFollowPatternCreateForm.noRemoteClustersConnectedCallOutTitle',
      defaultMessage: 'Remote cluster connection error'
    });

    return (
      <Fragment>
        <EuiCallOut
          title={title}
          color="warning"
          iconType="cross"
        >
          <p>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternCreateForm.noRemoteClustersConnectedCallOutDescription"
              defaultMessage="None of your clusters are connected. Verify your clusters settings and make sure at least one cluster is connected before creating an auto-follow pattern." //eslint-disable-line max-len
            />
          </p>
          <EuiButton
            {...routing.getRouterLinkProps('/', BASE_PATH_REMOTE_CLUSTERS)}
            color="warning"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternCreateForm.viewRemoteClusterButtonLabel"
              defaultMessage="View remote clusters"
            />
          </EuiButton>
        </EuiCallOut>
      </Fragment>
    );
  }

  render() {
    const { saveAutoFollowPattern, apiStatus, apiError, intl } = this.props;

    const breadcrumbs = [{
      text: (
        <FormattedMessage
          id="xpack.crossClusterReplication.breadcrumbs.listText"
          defaultMessage="Cross Cluster Replication"
        />
      ),
      ...routing.getRouterLinkProps('/'),
    }, {
      text: (
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPattern.breadcrumbs.addText"
          defaultMessage="Add auto-follow pattern"
        />
      ),
    }];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent
            horizontalPosition="center"
            className="crossClusterReplicationPageContent"
          >
            <EuiBreadcrumbs breadcrumbs={breadcrumbs} responsive={false} />
            <EuiSpacer size="xs" />

            <EuiPageContentHeader>
              <EuiTitle size="l">
                <h1>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPattern.addTitle"
                    defaultMessage="Add auto-follow pattern"
                  />
                </h1>
              </EuiTitle>
            </EuiPageContentHeader>

            <RemoteClustersProvider>
              {({ isLoading, error, remoteClusters }) => {
                if (isLoading) {
                  return (
                    <SectionLoading>
                      <FormattedMessage
                        id="xpack.crossClusterReplication.autoFollowPatternCreateForm.loadingRemoteClusters"
                        defaultMessage="Loading remote clusters..."
                      />
                    </SectionLoading>
                  );
                }

                if (error) {
                  const title = intl.formatMessage({
                    id: 'xpack.crossClusterReplication.autoFollowPatternCreateForm.loadingRemoteClustersErrorTitle',
                    defaultMessage: 'Error loading remote clusters',
                  });
                  return <SectionError title={title} error={error} />;
                }

                if (!remoteClusters.length) {
                  return this.renderEmptyClusters();
                }

                if (remoteClusters.every(cluster => cluster.isConnected === false)) {
                  return this.renderNoConnectedCluster();
                }

                return (
                  <AutoFollowPatternForm
                    apiStatus={apiStatus}
                    apiError={apiError}
                    remoteClusters={remoteClusters}
                    saveAutoFollowPattern={saveAutoFollowPattern}
                  />
                );
              }}
            </RemoteClustersProvider>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const AutoFollowPatternAdd = injectI18n(AutoFollowPatternAddUi);
