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
  EuiButton,
  EuiCallOut,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { listBreadcrumb, editBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../../common/constants';
import {
  FollowerIndexForm,
  FollowerIndexPageTitle,
  SectionLoading,
  SectionError,
} from '../../components';
import { API_STATUS } from '../../constants';

export const FollowerIndexEdit = injectI18n(
  class extends PureComponent {
    static propTypes = {
      getFollowerIndex: PropTypes.func.isRequired,
      selectFollowerIndex: PropTypes.func.isRequired,
      saveFollowerIndex: PropTypes.func.isRequired,
      clearApiError: PropTypes.func.isRequired,
      apiError: PropTypes.object.isRequired,
      apiStatus: PropTypes.object.isRequired,
      followerIndex: PropTypes.object,
      followerIndexId: PropTypes.string,
    }

    static getDerivedStateFromProps({ followerIndexId }, { lastFollowerIndexId }) {
      if (lastFollowerIndexId !== followerIndexId) {
        return { lastFollowerIndexId: followerIndexId };
      }
      return null;
    }

    state = { lastFollowerIndexId: undefined }

    componentDidMount() {
      const { match: { params: { id } }, selectFollowerIndex } = this.props;
      const decodedId = decodeURIComponent(id);

      selectFollowerIndex(decodedId);

      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, editBreadcrumb ]);
    }

    componentDidUpdate(prevProps, prevState) {
      const { followerIndex, getFollowerIndex } = this.props;
      if (!followerIndex && prevState.lastFollowerIndexId !== this.state.lastFollowerIndexId) {
        // Fetch the auto-follow pattern on the server
        getFollowerIndex(this.state.lastFollowerIndexId);
      }
    }

    componentWillUnmount() {
      this.props.clearApiError();
    }

    renderLoadingFollowerIndex() {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexEditForm.loadingFollowerIndexTitle"
            defaultMessage="Loading follower index..."
          />
        </SectionLoading>
      );
    }

    renderGetFollowerIndexError(error) {
      const { intl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.followerIndexEditForm.loadingErrorTitle',
        defaultMessage: 'Error loading follower index',
      });

      return (
        <Fragment>
          <SectionError title={title} error={error} />
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiButton
                {...routing.getRouterLinkProps('/follower_indices')}
                fill
                iconType="plusInCircle"
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexEditForm.viewFollowerIndicesButtonLabel"
                  defaultMessage="View follower indices"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      );
    }

    renderEmptyClusters() {
      const { intl, match: { url: currentUrl } } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.followerIndexEditForm.emptyRemoteClustersCallOutTitle',
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
                id="xpack.crossClusterReplication.followerIndexEditForm.emptyRemoteClustersCallOutDescription"
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
                id="xpack.crossClusterReplication.followerIndexEditForm.addRemoteClusterButtonLabel"
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
        id: 'xpack.crossClusterReplication.followerIndexEditForm.noRemoteClustersConnectedCallOutTitle',
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
                id="xpack.crossClusterReplication.followerIndexEditForm.noRemoteClustersConnectedCallOutDescription"
                defaultMessage="None of your clusters are connected. Verify your clusters settings
                  and make sure at least one cluster is connected before creating an auto-follow pattern." //eslint-disable-line max-len
              />
            </p>
            <EuiButton
              {...routing.getRouterLinkProps('/', BASE_PATH_REMOTE_CLUSTERS)}
              color="warning"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexEditForm.viewRemoteClusterButtonLabel"
                defaultMessage="View remote clusters"
              />
            </EuiButton>
          </EuiCallOut>
        </Fragment>
      );
    }

    render() {
      const {
        saveFollowerIndex,
        clearApiError,
        apiStatus,
        apiError,
        followerIndex,
      } = this.props;

      /* remove non-editable properties */
      const { shards, ...rest } = followerIndex || {}; // eslint-disable-line no-unused-vars

      return (
        <EuiPage>
          <EuiPageBody>
            <EuiPageContent
              horizontalPosition="center"
              className="ccrPageContent"
            >
              <FollowerIndexPageTitle
                title={(
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndex.editTitle"
                    defaultMessage="Edit follower index"
                  />
                )}
              />

              {apiStatus.get === API_STATUS.LOADING && this.renderLoadingFollowerIndex()}

              {apiError.get && this.renderGetFollowerIndexError(apiError.get)}

              { followerIndex && (
                <FollowerIndexForm
                  followerIndex={rest}
                  apiStatus={apiStatus.save}
                  apiError={apiError.save}
                  saveFollowerIndex={saveFollowerIndex}
                  clearApiError={clearApiError}
                />
              ) }
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      );
    }
  }
);
