/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';
import { extractQueryParams } from '../../../../shared_imports';
import { trackUiMetric, METRIC_TYPE } from '../../../services/track_ui_metric';
import { API_STATUS, UIM_FOLLOWER_INDEX_LIST_LOAD } from '../../../constants';
import { SectionLoading, SectionError, SectionUnauthorized } from '../../../components';
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

  renderHeader() {
    const { isAuthorized, history } = this.props;

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexList.followerIndicesDescription"
                  defaultMessage="A follower index replicates a leader index on a remote cluster."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {isAuthorized && (
              <EuiButton
                {...reactRouterNavigate(history, `/follower_indices/add`)}
                fill
                iconType="plusInCircle"
                data-test-subj="createFollowerIndexButton"
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.followerIndexList.addFollowerButtonLabel"
                  defaultMessage="Create a follower index"
                />
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  renderContent(isEmpty) {
    const { apiError, isAuthorized, apiStatus } = this.props;

    if (!isAuthorized) {
      return (
        <SectionUnauthorized
          title={
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexList.permissionErrorTitle"
              defaultMessage="Permission error"
            />
          }
        >
          <FormattedMessage
            id="xpack.crossClusterReplication.followerIndexList.noPermissionText"
            defaultMessage="You do not have permission to view or add follower indices."
          />
        </SectionUnauthorized>
      );
    }

    if (apiError) {
      const title = i18n.translate(
        'xpack.crossClusterReplication.followerIndexList.loadingErrorTitle',
        {
          defaultMessage: 'Error loading follower indices',
        }
      );

      return (
        <Fragment>
          <SectionError title={title} error={apiError} />
          <EuiSpacer size="m" />
        </Fragment>
      );
    }

    if (isEmpty) {
      return this.renderEmpty();
    }

    if (apiStatus === API_STATUS.LOADING) {
      return this.renderLoading();
    }

    return this.renderList();
  }

  renderEmpty() {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndexList.emptyPromptTitle"
              defaultMessage="Create your first follower index"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.followerIndexList.emptyPromptDescription"
                defaultMessage="Use a follower index to replicate a leader index on a remote cluster."
              />
            </p>
          </Fragment>
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
        data-test-subj="emptyPrompt"
      />
    );
  }

  renderLoading() {
    return (
      <SectionLoading dataTestSubj="followerIndexLoading">
        <FormattedMessage
          id="xpack.crossClusterReplication.followerIndexList.loadingTitle"
          defaultMessage="Loading follower indices..."
        />
      </SectionLoading>
    );
  }

  renderList() {
    const { selectFollowerIndex, followerIndices } = this.props;

    const { isDetailPanelOpen } = this.state;

    return (
      <Fragment>
        <FollowerIndicesTable followerIndices={followerIndices} />
        {isDetailPanelOpen && <DetailPanel closeDetailPanel={() => selectFollowerIndex(null)} />}
      </Fragment>
    );
  }

  render() {
    const { followerIndices, apiStatus } = this.props;
    const isEmpty = apiStatus === API_STATUS.IDLE && !followerIndices.length;
    return (
      <Fragment>
        {!isEmpty && this.renderHeader()}
        {this.renderContent(isEmpty)}
      </Fragment>
    );
  }
}
