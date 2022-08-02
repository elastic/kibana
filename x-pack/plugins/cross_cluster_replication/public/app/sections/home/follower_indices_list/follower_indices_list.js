/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageContent, EuiButton, EuiEmptyPrompt, EuiText, EuiSpacer } from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { extractQueryParams, PageLoading, PageError } from '../../../../shared_imports';
import { trackUiMetric, METRIC_TYPE } from '../../../services/track_ui_metric';
import { API_STATUS, UIM_FOLLOWER_INDEX_LIST_LOAD } from '../../../constants';
import { FollowerIndicesTable, DetailPanel } from './components';

const REFRESH_RATE_MS = 30000;

const getQueryParamName = ({ location: { search } }) => {
  const { name } = extractQueryParams(search);
  return name ? decodeURIComponent(name) : null;
};

export class FollowerIndicesList extends PureComponent {
  static propTypes = {
    loadFollowerIndices: PropTypes.func,
    selectFollowerIndex: PropTypes.func,
    followerIndices: PropTypes.array,
    apiStatus: PropTypes.string,
    apiError: PropTypes.object,
  };

  static getDerivedStateFromProps({ followerIndexId }, { lastFollowerIndexId }) {
    if (followerIndexId !== lastFollowerIndexId) {
      return {
        lastFollowerIndexId: followerIndexId,
        isDetailPanelOpen: !!followerIndexId,
      };
    }
    return null;
  }

  state = {
    lastFollowerIndexId: null,
    isDetailPanelOpen: false,
  };

  componentDidMount() {
    const { loadFollowerIndices, selectFollowerIndex, history } = this.props;

    trackUiMetric(METRIC_TYPE.LOADED, UIM_FOLLOWER_INDEX_LIST_LOAD);
    loadFollowerIndices();

    // Select the pattern in the URL query params
    selectFollowerIndex(getQueryParamName(history));

    // Interval to load follower indices in the background passing "true" to the fetch method
    this.interval = setInterval(() => loadFollowerIndices(true), REFRESH_RATE_MS);
  }

  componentDidUpdate(prevProps, prevState) {
    const { history } = this.props;
    const { lastFollowerIndexId } = this.state;

    /**
     * Each time our state is updated (through getDerivedStateFromProps())
     * we persist the follower index id to query params for deep linking
     */
    if (lastFollowerIndexId !== prevState.lastFollowerIndexId) {
      if (!lastFollowerIndexId) {
        history.replace({
          search: '',
        });
      } else {
        history.replace({
          search: `?name=${encodeURIComponent(lastFollowerIndexId)}`,
        });
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  renderEmpty() {
    return (
      <EuiPageContent
        hasShadow={false}
        paddingSize="none"
        verticalPosition="center"
        horizontalPosition="center"
      >
        <EuiEmptyPrompt
          iconType="managementApp"
          data-test-subj="emptyPrompt"
          title={
            <h1>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.emptyPromptTitle"
                defaultMessage="Create your first follower index"
              />
            </h1>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.emptyPromptDescription"
                defaultMessage="Use a follower index to replicate a leader index on a remote cluster."
              />
            </p>
          }
          actions={
            <EuiButton
              {...reactRouterNavigate(this.props.history, `/follower_indices/add`)}
              fill
              iconType="plusInCircle"
              data-test-subj="createFollowerIndexButton"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.addFollowerButtonLabel"
                defaultMessage="Create a follower index"
              />
            </EuiButton>
          }
        />
      </EuiPageContent>
    );
  }

  renderLoading() {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.crossClusterReplication.followerIndexList.loadingTitle"
          defaultMessage="Loading follower indices..."
        />
      </PageLoading>
    );
  }

  renderList() {
    const { selectFollowerIndex, followerIndices } = this.props;

    const { isDetailPanelOpen } = this.state;

    return (
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexList.followerIndicesDescription"
              defaultMessage="A follower index replicates a leader index on a remote cluster."
            />
          </p>
        </EuiText>

        <EuiSpacer size="l" />

        <FollowerIndicesTable followerIndices={followerIndices} />

        {isDetailPanelOpen && <DetailPanel closeDetailPanel={() => selectFollowerIndex(null)} />}
      </>
    );
  }

  render() {
    const { followerIndices, apiError, isAuthorized, apiStatus } = this.props;
    const isEmpty = apiStatus === API_STATUS.IDLE && !followerIndices.length;

    if (!isAuthorized) {
      return (
        <PageError
          title={
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexList.permissionErrorTitle"
              defaultMessage="Permission error"
            />
          }
          error={{
            error: (
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.noPermissionText"
                defaultMessage="You do not have permission to view or add follower indices."
              />
            ),
          }}
        />
      );
    }

    if (apiError) {
      const title = i18n.translate(
        'xpack.crossClusterReplication.followerIndexList.loadingErrorTitle',
        {
          defaultMessage: 'Error loading follower indices',
        }
      );

      return <PageError title={title} error={apiError.body} />;
    }

    if (isEmpty) {
      return this.renderEmpty();
    }

    if (apiStatus === API_STATUS.LOADING) {
      return this.renderLoading();
    }

    return this.renderList();
  }
}
