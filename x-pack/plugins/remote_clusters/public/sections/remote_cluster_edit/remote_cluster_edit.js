/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { listBreadcrumbLink, editBreadcrumb } from '../../services';
import { RemoteClusterForm } from '../remote_cluster_form';

const disabledFields = {
  name: true,
};

export class RemoteClusterEditUi extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    cluster: PropTypes.object,
    startEditingCluster: PropTypes.func,
    stopEditingCluster: PropTypes.func,
    editCluster: PropTypes.func,
    isEditingCluster: PropTypes.bool,
    getEditClusterError: PropTypes.string,
    clearEditClusterErrors: PropTypes.func,
    openDetailPanel: PropTypes.func,
  }

  constructor(props) {
    super(props);

    chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumbLink, editBreadcrumb ]);

    const {
      match: {
        params: {
          name,
        },
      },
    } = props;

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
    const { history, openDetailPanel } = this.props;
    const { clusterName } = this.state;
    history.push(CRUD_APP_BASE_PATH);
    openDetailPanel(clusterName);
  };

  renderContent() {
    const {
      isLoading,
      cluster,
      isEditingCluster,
      getEditClusterError,
    } = this.props;

    if (isLoading) {
      return (
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="s"
        >
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
    } else if (!cluster) {
      return (
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="xpack.remoteClusters.edit.notFoundLabel"
                  defaultMessage="Remote cluster not found"
                />
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <RemoteClusterForm
        fields={cluster}
        disabledFields={disabledFields}
        isSaving={isEditingCluster}
        saveError={getEditClusterError}
        save={this.save}
        cancel={this.cancel}
      />
    );
  }

  render() {
    const {
      clusterName,
    } = this.state;

    return (
      <Fragment>
        <EuiPage>
          <EuiPageBody>
            <EuiPageContent
              horizontalPosition="center"
              className="remoteClusterAddPage"
            >
              <EuiSpacer size="xs" />

              <EuiPageContentHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.remoteClusters.editTitle"
                      defaultMessage="Edit {name}"
                      values={{ name: clusterName }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageContentHeader>

              {this.renderContent()}
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      </Fragment>
    );
  }
}

export const RemoteClusterEdit = injectI18n(RemoteClusterEditUi);
