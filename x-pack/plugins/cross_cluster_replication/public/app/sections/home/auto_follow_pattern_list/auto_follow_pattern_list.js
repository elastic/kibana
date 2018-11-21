/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import routing from '../../../services/routing';
import { API_STATUS } from '../../../constants';
import { BASE_PATH } from '../../../../../common/constants';
import { SectionLoading, SectionError } from '../../../components';
import { AutoFollowPatternTable } from './components';

const REFRESH_RATE_MS = 30000;

export class AutoFollowPatternListUI extends PureComponent {
  static propTypes = {
    loadAutoFollowPatterns: PropTypes.func,
    autoFollowPatterns: PropTypes.array,
    apiStatus: PropTypes.string,
    apiError: PropTypes.object,
  }

  componentDidMount() {
    this.props.loadAutoFollowPatterns();

    // Interval to load auto-follow patterns in the background passing "true" to the fetch method
    this.interval = setInterval(() => this.props.loadAutoFollowPatterns(true), REFRESH_RATE_MS);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  renderEmpty() {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={(
          <h1>
            <FormattedMessage
              id="xpack.cross_cluster_replication.autoFollowPatternList.emptyPromptTitle"
              defaultMessage="Create your first auto-follow pattern"
            />
          </h1>
        )}
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.cross_cluster_replication.autoFollowPatternList.emptyPromptDescription"
                defaultMessage="Auto follow-patterns automatically create follower index to replicate indices from a leader cluster."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            {...routing.getRouterLinkProps(`${BASE_PATH}/auto_follow_patterns/add`)}
            fill
            iconType="plusInCircle"
          >
            <FormattedMessage
              id="xpack.cross_cluster_replication.addAutoFollowPatternButtonLabel"
              defaultMessage="Add auto-follow pattern"
            />
          </EuiButton>
        }
      />
    );
  }

  renderList() {
    const { autoFollowPatterns, apiStatus } = this.props;

    if (apiStatus === API_STATUS.LOADING) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.cross_cluster_replication.autoFollowPatternList.loadingTitle"
            defaultMessage="Loading auto-follow patterns..."
          />
        </SectionLoading>
      );
    }

    return <AutoFollowPatternTable autoFollowPatterns={autoFollowPatterns} />;
  }

  render() {
    const { autoFollowPatterns, apiStatus, apiError, isAuthorized, intl } = this.props;

    if (!isAuthorized) {
      return null;
    }

    if (apiStatus === API_STATUS.IDLE && !autoFollowPatterns.length) {
      return this.renderEmpty();
    }

    if (apiError) {
      const title = intl.formatMessage({
        id: 'xpack.cross_cluster_replication.autoFollowPatternList.loadingErrorTitle',
        defaultMessage: 'Error loading auto-follow patterns',
      });
      return <SectionError title={title} error={apiError} />;
    }

    return this.renderList();
  }
}

export const AutoFollowPatternList = injectI18n(AutoFollowPatternListUI);
