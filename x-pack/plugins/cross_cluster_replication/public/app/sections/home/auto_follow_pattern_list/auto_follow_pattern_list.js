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
import { API_STATUS, UIM_AUTO_FOLLOW_PATTERN_LIST_LOAD } from '../../../constants';
import { SectionLoading, SectionError, SectionUnauthorized } from '../../../components';
import { AutoFollowPatternTable, DetailPanel } from './components';

const REFRESH_RATE_MS = 30000;

const getQueryParamPattern = ({ location: { search } }) => {
  const { pattern } = extractQueryParams(search);
  return pattern ? decodeURIComponent(pattern) : null;
};

export class AutoFollowPatternList extends PureComponent {
  static propTypes = {
    loadAutoFollowPatterns: PropTypes.func,
    selectAutoFollowPattern: PropTypes.func,
    loadAutoFollowStats: PropTypes.func,
    autoFollowPatterns: PropTypes.array,
    apiStatus: PropTypes.string,
    apiError: PropTypes.object,
  };

  static getDerivedStateFromProps({ autoFollowPatternId }, { lastAutoFollowPatternId }) {
    if (autoFollowPatternId !== lastAutoFollowPatternId) {
      return {
        lastAutoFollowPatternId: autoFollowPatternId,
        isDetailPanelOpen: !!autoFollowPatternId,
      };
    }
    return null;
  }

  state = {
    lastAutoFollowPatternId: null,
    isDetailPanelOpen: false,
  };

  componentDidMount() {
    const {
      loadAutoFollowPatterns,
      loadAutoFollowStats,
      selectAutoFollowPattern,
      history,
    } = this.props;

    trackUiMetric(METRIC_TYPE.LOADED, UIM_AUTO_FOLLOW_PATTERN_LIST_LOAD);
    loadAutoFollowPatterns();
    loadAutoFollowStats();

    // Select the pattern in the URL query params
    selectAutoFollowPattern(getQueryParamPattern(history));

    // Interval to load auto-follow patterns in the background passing "true" to the fetch method
    this.interval = setInterval(() => loadAutoFollowPatterns(true), REFRESH_RATE_MS);
  }

  componentDidUpdate(prevProps, prevState) {
    const { history, loadAutoFollowStats } = this.props;
    const { lastAutoFollowPatternId } = this.state;

    /**
     * Each time our state is updated (through getDerivedStateFromProps())
     * we persist the auto-follow pattern id to query params for deep linking
     */
    if (lastAutoFollowPatternId !== prevState.lastAutoFollowPatternId) {
      if (!lastAutoFollowPatternId) {
        history.replace({
          search: '',
        });
      } else {
        history.replace({
          search: `?pattern=${encodeURIComponent(lastAutoFollowPatternId)}`,
        });

        loadAutoFollowStats();
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
                  id="xpack.crossClusterReplication.autoFollowPatternList.autoFollowPatternsDescription"
                  defaultMessage="An auto-follow pattern replicates leader indices from a remote
                    cluster and copies them to follower indices on the local cluster."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            {isAuthorized && (
              <EuiButton
                {...reactRouterNavigate(history, `/auto_follow_patterns/add`)}
                fill
                iconType="plusInCircle"
                data-test-subj="createAutoFollowPatternButton"
              >
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternList.addAutoFollowPatternButtonLabel"
                  defaultMessage="Create an auto-follow pattern"
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
    const { apiError, apiStatus, isAuthorized } = this.props;

    if (!isAuthorized) {
      return (
        <SectionUnauthorized
          title={
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternList.permissionErrorTitle"
              defaultMessage="Permission error"
            />
          }
        >
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternList.noPermissionText"
            defaultMessage="You do not have permission to view or add auto-follow patterns."
          />
        </SectionUnauthorized>
      );
    }

    if (apiError) {
      const title = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPatternList.loadingErrorTitle',
        {
          defaultMessage: 'Error loading auto-follow patterns',
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
      return (
        <SectionLoading dataTestSubj="autoFollowPatternLoading">
          <FormattedMessage
            id="xpack.crossClusterReplication.autoFollowPatternList.loadingTitle"
            defaultMessage="Loading auto-follow patterns..."
          />
        </SectionLoading>
      );
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
              id="xpack.crossClusterReplication.autoFollowPatternList.emptyPromptTitle"
              defaultMessage="Create your first auto-follow pattern"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternList.emptyPromptDescription"
                defaultMessage="Use an auto-follow pattern to automatically replicate indices from
                  a remote cluster."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            {...reactRouterNavigate(this.props.history, `/auto_follow_patterns/add`)}
            fill
            iconType="plusInCircle"
            data-test-subj="createAutoFollowPatternButton"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.addAutoFollowPatternButtonLabel"
              defaultMessage="Create auto-follow pattern"
            />
          </EuiButton>
        }
        data-test-subj="emptyPrompt"
      />
    );
  }

  renderList() {
    const { selectAutoFollowPattern, autoFollowPatterns } = this.props;

    const { isDetailPanelOpen } = this.state;

    return (
      <>
        <AutoFollowPatternTable autoFollowPatterns={autoFollowPatterns} />
        {isDetailPanelOpen && (
          <DetailPanel closeDetailPanel={() => selectAutoFollowPattern(null)} />
        )}
      </>
    );
  }

  render() {
    const { autoFollowPatterns, apiStatus } = this.props;
    const isEmpty = apiStatus === API_STATUS.IDLE && !autoFollowPatterns.length;

    return (
      <Fragment>
        {!isEmpty && this.renderHeader()}
        {this.renderContent(isEmpty)}
      </Fragment>
    );
  }
}
