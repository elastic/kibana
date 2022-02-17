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

import { EuiButton, EuiPageContent, EuiEmptyPrompt, EuiPageContentBody } from '@elastic/eui';

import { listBreadcrumb, editBreadcrumb, setBreadcrumbs } from '../../services/breadcrumbs';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
} from '../../components';
import { API_STATUS } from '../../constants';
import { SectionLoading } from '../../../shared_imports';

export class AutoFollowPatternEdit extends PureComponent {
  static propTypes = {
    getAutoFollowPattern: PropTypes.func.isRequired,
    selectAutoFollowPattern: PropTypes.func.isRequired,
    saveAutoFollowPattern: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object.isRequired,
    apiStatus: PropTypes.object.isRequired,
    autoFollowPattern: PropTypes.object,
    autoFollowPatternId: PropTypes.string,
  };

  static getDerivedStateFromProps({ autoFollowPatternId }, { lastAutoFollowPatternId }) {
    if (lastAutoFollowPatternId !== autoFollowPatternId) {
      return { lastAutoFollowPatternId: autoFollowPatternId };
    }
    return null;
  }

  state = { lastAutoFollowPatternId: undefined };

  componentDidMount() {
    const {
      match: {
        params: { id },
      },
      selectAutoFollowPattern,
    } = this.props;
    const decodedId = decodeURIComponent(id);

    selectAutoFollowPattern(decodedId);

    setBreadcrumbs([listBreadcrumb('/auto_follow_patterns'), editBreadcrumb]);
  }

  componentDidUpdate(prevProps, prevState) {
    const { autoFollowPattern, getAutoFollowPattern } = this.props;
    // Fetch the auto-follow pattern on the server if we don't have it (i.e. page reload)
    if (
      !autoFollowPattern &&
      prevState.lastAutoFollowPatternId !== this.state.lastAutoFollowPatternId
    ) {
      getAutoFollowPattern(this.state.lastAutoFollowPatternId);
    }
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  renderGetAutoFollowPatternError(error) {
    const {
      match: {
        params: { id: name },
      },
    } = this.props;

    const errorMessage =
      error.body.statusCode === 404
        ? {
            error: i18n.translate(
              'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingErrorMessage',
              {
                defaultMessage: `The auto-follow pattern '{name}' does not exist.`,
                values: { name },
              }
            ),
          }
        : error;

    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          iconType="alert"
          title={
            <h2>
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternEditForm.loadingErrorTitle"
                defaultMessage="Error loading auto-follow pattern"
              />
            </h2>
          }
          body={<p>{errorMessage}</p>}
          actions={
            <EuiButton
              {...reactRouterNavigate(this.props.history, `/auto_follow_patterns`)}
              color="danger"
              flush="left"
              iconType="arrowLeft"
              data-test-subj="viewAutoFollowPatternListButton"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternEditForm.viewAutoFollowPatternsButtonLabel"
                defaultMessage="View auto-follow patterns"
              />
            </EuiButton>
          }
        />
      </EuiPageContent>
    );
  }

  renderLoading(loadingTitle) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>{loadingTitle}</SectionLoading>
      </EuiPageContent>
    );
  }

  render() {
    const {
      saveAutoFollowPattern,
      apiStatus,
      apiError,
      autoFollowPattern,
      match: { url: currentUrl },
    } = this.props;

    if (apiStatus.get === API_STATUS.LOADING || !autoFollowPattern) {
      return this.renderLoading(
        i18n.translate('xpack.crossClusterReplication.autoFollowPatternEditForm.loadingTitle', {
          defaultMessage: 'Loading auto-follow pattern…',
        })
      );
    }

    if (apiError.get) {
      return this.renderGetAutoFollowPatternError(apiError.get);
    }

    return (
      <RemoteClustersProvider>
        {({ isLoading, error, remoteClusters }) => {
          if (isLoading) {
            return this.renderLoading(
              i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingRemoteClustersMessage',
                { defaultMessage: 'Loading remote clusters…' }
              )
            );
          }

          return (
            <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
              <AutoFollowPatternPageTitle
                title={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPattern.editTitle"
                    defaultMessage="Edit auto-follow pattern"
                  />
                }
              />

              <AutoFollowPatternForm
                apiStatus={apiStatus.save}
                apiError={apiError.save}
                currentUrl={currentUrl}
                remoteClusters={error ? [] : remoteClusters}
                autoFollowPattern={autoFollowPattern}
                saveAutoFollowPattern={saveAutoFollowPattern}
                saveButtonLabel={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternEditForm.saveButtonLabel"
                    defaultMessage="Update"
                  />
                }
              />
            </EuiPageContentBody>
          );
        }}
      </RemoteClustersProvider>
    );
  }
}
