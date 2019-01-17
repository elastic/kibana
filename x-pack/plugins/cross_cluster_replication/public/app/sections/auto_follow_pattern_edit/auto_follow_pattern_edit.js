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
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

import { listBreadcrumb, editBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
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
      selectAutoFollowPattern: PropTypes.func.isRequired,
      saveAutoFollowPattern: PropTypes.func.isRequired,
      clearApiError: PropTypes.func.isRequired,
      apiError: PropTypes.object,
      apiStatus: PropTypes.string.isRequired,
      autoFollowPattern: PropTypes.object,
      autoFollowPatternId: PropTypes.string,
    }

    static getDerivedStateFromProps({ autoFollowPatternId }, { lastAutoFollowPatternId }) {
      if (lastAutoFollowPatternId !== autoFollowPatternId) {
        return { lastAutoFollowPatternId: autoFollowPatternId };
      }
      return null;
    }

    state = { lastAutoFollowPatternId: undefined }

    componentDidMount() {
      const { match: { params: { id } }, selectAutoFollowPattern } = this.props;
      const decodedId = decodeURIComponent(id);

      selectAutoFollowPattern(decodedId);

      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, editBreadcrumb ]);
    }

    componentDidUpdate(prevProps, prevState) {
      const { autoFollowPattern, getAutoFollowPattern } = this.props;
      if (!autoFollowPattern && prevState.lastAutoFollowPatternId !== this.state.lastAutoFollowPatternId) {
        // Fetch the auto-follow pattern on the server
        getAutoFollowPattern(this.state.lastAutoFollowPatternId);
      }
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
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                {...routing.getRouterLinkProps('/auto_follow_patterns')}
                iconType="arrowLeft"
                flush="left"
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternEditForm.viewAutoFollowPatternsButtonLabel"
                  defaultMessage="View auto-follow patterns"
                />
              </EuiButtonEmpty>
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

    render() {
      const { saveAutoFollowPattern, apiStatus, apiError, autoFollowPattern, intl, match: { url: currentUrl }  } = this.props;

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

                    return (
                      <AutoFollowPatternForm
                        apiStatus={apiStatus}
                        apiError={apiError}
                        currentUrl={currentUrl}
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
