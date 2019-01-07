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
import { extractQueryParams } from '../../../services/query_params';
import { API_STATUS } from '../../../constants';
import { SectionLoading, SectionError } from '../../../components';
import { AutoFollowPatternTable, DetailPanel } from './components';

const REFRESH_RATE_MS = 30000;

export const AutoFollowPatternList = injectI18n(
  class extends PureComponent {
    static propTypes = {
      loadAutoFollowPatterns: PropTypes.func,
      loadAutoFollowStats: PropTypes.func,
      autoFollowPatterns: PropTypes.array,
      apiStatus: PropTypes.string,
      apiError: PropTypes.object,
      openDetailPanel: PropTypes.func.isRequired,
      closeDetailPanel: PropTypes.func.isRequired,
      isDetailPanelOpen: PropTypes.bool,
    }

    componentDidMount() {
      this.props.loadAutoFollowPatterns();
      this.props.loadAutoFollowStats();

      // Interval to load auto-follow patterns in the background passing "true" to the fetch method
      this.interval = setInterval(() => this.props.loadAutoFollowPatterns(true), REFRESH_RATE_MS);
    }

    componentWillUnmount() {
      clearInterval(this.interval);
    }

    componentDidUpdate() {
      const {
        openDetailPanel,
        closeDetailPanel,
        isDetailPanelOpen,
        history: {
          location: {
            search,
          },
        },
      } = this.props;

      const { pattern: patternName } = extractQueryParams(search);

      // Show deeplinked auto follow pattern whenever patterns get loaded or the URL changes.
      if (patternName != null) {
        openDetailPanel(patternName);
      } else if (isDetailPanelOpen) {
        closeDetailPanel();
      }
    }

    renderEmpty() {
      return (
        <EuiEmptyPrompt
          iconType="managementApp"
          title={(
            <h1>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternList.emptyPromptTitle"
                defaultMessage="Create your first auto-follow pattern"
              />
            </h1>
          )}
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
              {...routing.getRouterLinkProps('/auto_follow_patterns/add')}
              fill
              iconType="plusInCircle"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.addAutoFollowPatternButtonLabel"
                defaultMessage="Create auto-follow pattern"
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
              id="xpack.crossClusterReplication.autoFollowPatternList.loadingTitle"
              defaultMessage="Loading auto-follow patterns..."
            />
          </SectionLoading>
        );
      }

      return (
        <Fragment>
          <AutoFollowPatternTable autoFollowPatterns={autoFollowPatterns} />
          <DetailPanel />
        </Fragment>
      );
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
          id: 'xpack.crossClusterReplication.autoFollowPatternList.loadingErrorTitle',
          defaultMessage: 'Error loading auto-follow patterns',
        });
        return <SectionError title={title} error={apiError} />;
      }

      return this.renderList();
    }
  }
);
