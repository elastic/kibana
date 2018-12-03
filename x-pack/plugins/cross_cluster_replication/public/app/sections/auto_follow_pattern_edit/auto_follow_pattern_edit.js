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

class AutoFollowPatternEditUi extends PureComponent {
  static propTypes = {
    createAutoFollowPattern: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  renderMissingCluster({ name, remoteCluster }) {
    const { intl } = this.props;

    const title = intl.formatMessage({
      id: 'xpack.crossClusterReplication.autoFollowPatternEditForm.emptyRemoteClustersTitle',
      defaultMessage: 'Remote cluster not found'
    });

    return (
      <Fragment>
        <EuiCallOut
          title={title}
          color="warning"
          iconType="help"
        >
          <p>

            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternEditForm.emptyRemoteClustersDescription"
              defaultMessage="The remote cluster '{remoteCluster}' does not exist or is not connected. Make sure it is connected before editing the '{name}' auto-follow pattern." //eslint-disable-line max-len
              values={{ remoteCluster, name }}
            />
          </p>
          <EuiButton
            {...routing.getRouterLinkProps('/list', BASE_PATH_REMOTE_CLUSTERS)}
            color="warning"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternEditForm.viewtRemoteClustersButtonLabel"
              defaultMessage="View remote clusters"
            />
          </EuiButton>
        </EuiCallOut>
      </Fragment>
    );
  }

  render() {
    const { createAutoFollowPattern, apiStatus, apiError, autoFollowPattern } = this.props;

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
          id="xpack.crossClusterReplication.autoFollowPattern.breadcrumbs.editText"
          defaultMessage="Edit auto-follow pattern"
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
                    id="xpack.crossClusterReplication.autoFollowPattern.editTitle"
                    defaultMessage="Edit auto-follow pattern"
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

                const autoFollowPatternCluster = remoteClusters.find(cluster => cluster.name === autoFollowPattern.remoteCluster);

                if (!autoFollowPatternCluster || !autoFollowPatternCluster.isConnected) {
                  return this.renderMissingCluster(autoFollowPattern);
                }

                return (
                  <AutoFollowPatternForm
                    apiStatus={apiStatus}
                    apiError={apiError}
                    remoteClusters={remoteClusters}
                    autoFollowPattern={autoFollowPattern}
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

export const AutoFollowPatternEdit = injectI18n(AutoFollowPatternEditUi);
