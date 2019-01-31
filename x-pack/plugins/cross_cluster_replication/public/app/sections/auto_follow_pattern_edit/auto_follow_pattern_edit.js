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
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

import { listBreadcrumb, editBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../../common/constants';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
  SectionLoading,
  SectionError,
} from '../../components';
import { API_STATUS } from '../../constants';

export const AutoFollowPatternEdit = injectI18n(
  class extends PureComponent {
    static propTypes = {
      getAutoFollowPattern: PropTypes.func.isRequired,
      saveAutoFollowPattern: PropTypes.func.isRequired,
      clearApiError: PropTypes.func.isRequired,
      apiError: PropTypes.object,
      apiStatus: PropTypes.string.isRequired,
    }

    componentDidMount() {
      const { autoFollowPattern, match: { params: { id } } } = this.props;
      if (!autoFollowPattern) {
        const decodedId = decodeURIComponent(id);
        this.props.getAutoFollowPattern(decodedId);
      }

      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, editBreadcrumb ]);
    }

    componentWillUnmount() {
      this.props.clearApiError();
    }

    renderApiError(error) {
      const { intl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingErrorTitle',
        defaultMessage: 'Error loading auto-follow pattern',
      });

      return (
        <Fragment>
          <SectionError title={title} error={error} />
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiButton
                {...routing.getRouterLinkProps('/auto_follow_patterns')}
                fill
                iconType="plusInCircle"
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternEditForm.viewAutoFollowPatternsButtonLabel"
                  defaultMessage="View auto-follow patterns"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      );
    }

    renderLoadingAutoFollowPattern() {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternEditForm.loadingTitle"
            defaultMessage="Loading auto-follow pattern..."
          />
        </SectionLoading>
      );
    }

    renderMissingCluster({ name, remoteCluster }) {
      const { intl } = this.props;

      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.autoFollowPatternEditForm.emptyRemoteClustersTitle',
        defaultMessage: 'Remote cluster missing'
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
                defaultMessage="The remote cluster '{remoteCluster}' does not exist or is not
                  connected. Make sure it is connected before editing the '{name}' auto-follow pattern."
                values={{ remoteCluster, name }}
              />
            </p>
            <EuiButton
              {...routing.getRouterLinkProps('/list', BASE_PATH_REMOTE_CLUSTERS)}
              color="warning"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternEditForm.viewRemoteClustersButtonLabel"
                defaultMessage="View remote clusters"
              />
            </EuiButton>
          </EuiCallOut>
        </Fragment>
      );
    }

    render() {
      const { saveAutoFollowPattern, apiStatus, apiError, autoFollowPattern, intl } = this.props;

      return (
        <EuiPage>
          <EuiPageBody>
            <EuiPageContent
              horizontalPosition="center"
              className="ccrPageContent"
            >
              <AutoFollowPatternPageTitle
                title={(
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPattern.editTitle"
                    defaultMessage="Edit auto-follow pattern"
                  />
                )}
              />

              {apiStatus === API_STATUS.LOADING && this.renderLoadingAutoFollowPattern()}

              {apiError && this.renderApiError(apiError)}

              {autoFollowPattern && (
                <RemoteClustersProvider>
                  {({ isLoading, error, remoteClusters }) => {
                    if (isLoading) {
                      return (
                        <SectionLoading>
                          <FormattedMessage
                            id="xpack.crossClusterReplication.autoFollowPatternEditForm.loadingRemoteClusters"
                            defaultMessage="Loading remote clusters..."
                          />
                        </SectionLoading>
                      );
                    }

                    if (error) {
                      const title = intl.formatMessage({
                        id: 'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingRemoteClustersErrorTitle',
                        defaultMessage: 'Error loading remote clusters',
                      });
                      return <SectionError title={title} error={error} />;
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
                        saveAutoFollowPattern={saveAutoFollowPattern}
                      />
                    );
                  }}
                </RemoteClustersProvider>
              )}
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      );
    }
  }
);
