/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiPageContent, EuiSpacer } from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { extractQueryParams, SectionLoading } from '../../../shared_imports';
import { getRouter, redirect } from '../../services';
import { setBreadcrumbs } from '../../services/breadcrumb';
import { RemoteClusterPageTitle, RemoteClusterForm } from '../components';

export class RemoteClusterEdit extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    cluster: PropTypes.object,
    startEditingCluster: PropTypes.func,
    stopEditingCluster: PropTypes.func,
    editCluster: PropTypes.func,
    isEditingCluster: PropTypes.bool,
    getEditClusterError: PropTypes.object,
    clearEditClusterErrors: PropTypes.func,
    openDetailPanel: PropTypes.func,
  };

  constructor(props) {
    super(props);

    const {
      match: {
        params: { name },
      },
    } = props;

    setBreadcrumbs('edit', `?cluster=${name}`);

    this.state = {
      clusterName: name,
    };
  }

  componentDidMount() {
    const { startEditingCluster } = this.props;
    const { clusterName } = this.state;
    startEditingCluster(clusterName);
  }

  componentWillUnmount() {
    // Clean up after ourselves.
    this.props.clearEditClusterErrors();
    this.props.stopEditingCluster();
  }

  save = (clusterConfig) => {
    this.props.editCluster(clusterConfig);
  };

  cancel = () => {
    const { openDetailPanel } = this.props;
    const { clusterName } = this.state;
    const {
      history,
      route: {
        location: { search },
      },
    } = getRouter();
    const { redirect: redirectUrl } = extractQueryParams(search);

    if (redirectUrl) {
      const decodedRedirect = decodeURIComponent(redirectUrl);
      redirect(decodedRedirect);
    } else {
      history.push('/list');
      openDetailPanel(clusterName);
    }
  };

  render() {
    const { clusterName } = this.state;

    const { isLoading, cluster, isEditingCluster, getEditClusterError } = this.props;

    if (isLoading) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
          <SectionLoading>
            <FormattedMessage
              id="xpack.remoteClusters.edit.loadingLabel"
              defaultMessage="Loading remote cluster…"
            />
          </SectionLoading>
        </EuiPageContent>
      );
    }

    if (!cluster) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
          <EuiEmptyPrompt
            iconType="alert"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.remoteClusters.edit.loadingErrorTitle"
                  defaultMessage="Error loading remote cluster"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.remoteClusters.edit.loadingErrorMessage"
                  defaultMessage="The remote cluster '{name}' does not exist."
                  values={{ name: clusterName }}
                />
              </p>
            }
            actions={
              <EuiButton
                {...reactRouterNavigate(this.props.history, '/list')}
                color="danger"
                iconType="arrowLeft"
                flush="left"
              >
                <FormattedMessage
                  id="xpack.remoteClusters.edit.viewRemoteClustersButtonLabel"
                  defaultMessage="View remote clusters"
                />
              </EuiButton>
            }
          />
        </EuiPageContent>
      );
    }

    const { isConfiguredByNode, hasDeprecatedProxySetting } = cluster;

    if (isConfiguredByNode) {
      return (
        <EuiPageContent verticalPosition="center" horizontalPosition="center" color="primary">
          <EuiEmptyPrompt
            iconType="iInCircle"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.remoteClusters.edit.configuredByNodeWarningTitle"
                  defaultMessage="Defined in configuration"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.remoteClusters.configuredByNodeWarningBody"
                  defaultMessage="You can't edit or delete this remote cluster because it's defined in a node's
                  elasticsearch.yml configuration file."
                />
              </p>
            }
            actions={
              <EuiButton color="primary" iconType="arrowLeft" flush="left" onClick={this.cancel}>
                <FormattedMessage
                  id="xpack.remoteClusters.edit.backToRemoteClustersButtonLabel"
                  defaultMessage="Back to remote clusters"
                />
              </EuiButton>
            }
          />
        </EuiPageContent>
      );
    }

    return (
      <>
        <RemoteClusterPageTitle
          title={
            <FormattedMessage
              id="xpack.remoteClusters.editTitle"
              defaultMessage="Edit remote cluster"
            />
          }
        />

        {hasDeprecatedProxySetting ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.remoteClusters.edit.deprecatedSettingsTitle"
                  defaultMessage="Proceed with caution"
                />
              }
              color="warning"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.remoteClusters.edit.deprecatedSettingsMessage"
                defaultMessage="This remote cluster has deprecated settings that we tried to resolve. Verify all changes before saving."
              />
            </EuiCallOut>
            <EuiSpacer />
          </>
        ) : null}

        <RemoteClusterForm
          cluster={cluster}
          isSaving={isEditingCluster}
          saveError={getEditClusterError}
          save={this.save}
          cancel={this.cancel}
        />
      </>
    );
  }
}
