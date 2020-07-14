/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import { extractQueryParams } from '../../../shared_imports';
import { getRouter, redirect } from '../../services';
import { setBreadcrumbs } from '../../services/breadcrumb';
import { RemoteClusterPageTitle, RemoteClusterForm, ConfiguredByNodeWarning } from '../components';

const disabledFields = {
  name: true,
};

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

  renderContent() {
    const { clusterName } = this.state;

    const { isLoading, cluster, isEditingCluster, getEditClusterError } = this.props;

    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.remoteClusters.edit.loadingLabel"
                  defaultMessage="Loading remote cluster..."
                />
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!cluster) {
      return (
        <Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.remoteClusters.edit.loadingErrorTitle"
                defaultMessage="Error loading remote cluster"
              />
            }
            color="danger"
            iconType="alert"
          >
            <FormattedMessage
              id="xpack.remoteClusters.edit.loadingErrorMessage"
              defaultMessage="The remote cluster '{name}' does not exist."
              values={{ name: clusterName }}
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                {...reactRouterNavigate(this.props.history, '/list')}
                iconType="arrowLeft"
                flush="left"
              >
                <FormattedMessage
                  id="xpack.remoteClusters.edit.viewRemoteClustersButtonLabel"
                  defaultMessage="View remote clusters"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      );
    }

    const { isConfiguredByNode, hasDeprecatedProxySetting } = cluster;

    if (isConfiguredByNode) {
      return (
        <Fragment>
          <ConfiguredByNodeWarning />

          <EuiSpacer size="s" />

          <EuiButtonEmpty color="primary" onClick={this.cancel}>
            <FormattedMessage
              id="xpack.remoteClusters.edit.backToRemoteClustersButtonLabel"
              defaultMessage="Back to remote clusters"
            />
          </EuiButtonEmpty>
        </Fragment>
      );
    }

    return (
      <>
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
          fields={cluster}
          disabledFields={disabledFields}
          isSaving={isEditingCluster}
          saveError={getEditClusterError}
          save={this.save}
          cancel={this.cancel}
        />
      </>
    );
  }

  render() {
    return (
      <EuiPageContent horizontalPosition="center" className="remoteClusterAddPage">
        <RemoteClusterPageTitle
          title={
            <FormattedMessage
              id="xpack.remoteClusters.editTitle"
              defaultMessage="Edit remote cluster"
            />
          }
        />

        {this.renderContent()}
      </EuiPageContent>
    );
  }
}
