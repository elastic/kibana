/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiPageContent,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';

import { listBreadcrumb, addBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../../common/constants';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
  SectionLoading,
  SectionError,
} from '../../components';

export const AutoFollowPatternAdd = injectI18n(
  class extends PureComponent {
    static propTypes = {
      saveAutoFollowPattern: PropTypes.func.isRequired,
      clearApiError: PropTypes.func.isRequired,
      apiError: PropTypes.object,
      apiStatus: PropTypes.string.isRequired,
    }

    componentDidMount() {
      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, addBreadcrumb ]);
    }

    componentWillUnmount() {
      this.props.clearApiError();
    }

    renderEmptyClusters() {
      const { intl, match: { url: currentUrl } } = this.props;
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
                defaultMessage="Auto-follow patterns capture indices on remote clusters. You must add
                  a remote cluster."
              />
            </p>

            <EuiButton
              {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl })}
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
                defaultMessage="None of your clusters are connected. Verify your clusters settings
                  and make sure at least one cluster is connected before creating an auto-follow pattern." //eslint-disable-line max-len
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

      return (
        <EuiPageContent>
          <AutoFollowPatternPageTitle
            title={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPattern.addTitle"
                defaultMessage="Add auto-follow pattern"
              />
            )}
          />

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
      );
    }
  }
);
