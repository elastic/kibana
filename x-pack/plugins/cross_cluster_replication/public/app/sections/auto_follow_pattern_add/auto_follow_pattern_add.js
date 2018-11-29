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
  EuiEmptyPrompt,
} from '@elastic/eui';

import routing from '../../services/routing';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../../common/constants';
import { RemoteClustersProvider, SectionLoading, SectionError } from '../../components';
import { AutoFollowPatternForm } from './components';

class AutoFollowPatternAddUI extends PureComponent {
  static propTypes = {
    createAutoFollowPattern: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  renderEmptyClusters() {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={(
          <h1>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.emptyRemoteClustersPromptTitle"
              defaultMessage="No remote cluster found"
            />
          </h1>
        )}
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.emptyRemoteClustersPromptDescription"
                defaultMessage="You haven't added yet any remote cluster. In order to create an auto-follow pattern you need to connect a remote cluster first." //eslint-disable-line max-len
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS)}
            fill
            iconType="plusInCircle"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.connectRemoteClusterButtonLabel"
              defaultMessage="Connect remote cluster"
            />
          </EuiButton>
        }
      />
    );
  }

  renderNoConnectedCluster() {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={(
          <h1>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.noRemoteClustersConnectedPromptTitle"
              defaultMessage="None of your clusters are connected"
            />
          </h1>
        )}
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternForm.noRemoteClustersConnectedPromptDescription"
                defaultMessage="None of your clusters are connected. Please verify your clusters settings and make sure at least one cluster is connected before creating an auto-follow pattern." // eslint-disable-line max-len
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            {...routing.getRouterLinkProps('/', BASE_PATH_REMOTE_CLUSTERS)}
            fill
            iconType="plusInCircle"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.connectRemoteClusterButtonLabel"
              defaultMessage="View remote clusters"
            />
          </EuiButton>
        }
      />
    );
  }

  render() {
    const { createAutoFollowPattern, apiStatus, apiError } = this.props;

    const breadcrumbs = [{
      text: (
        <FormattedMessage
          id="xpack.crossClusterReplication.breadcrumbs.listText"
          defaultMessage="Cross Cluster Replication"
        />
      ),
      ...routing.getRouterLinkProps(),
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
          <EuiPageContent >
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
                        id="xpack.crossClusterReplication.autoFollowPatternForm.loadingRemoteClusters"
                        defaultMessage="Loading remote clusters..."
                      />
                    </SectionLoading>
                  );
                }

                if (error) {
                  return <SectionError title={null} error={error} />;
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
                    createAutoFollowPattern={createAutoFollowPattern}
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

export const AutoFollowPatternAdd = injectI18n(AutoFollowPatternAddUI);
