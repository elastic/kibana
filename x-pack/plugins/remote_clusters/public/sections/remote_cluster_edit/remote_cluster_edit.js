/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiBreadcrumbs,
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
import { getRouterLinkProps } from '../../services';

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
    updateRemoteCluster: PropTypes.func,
    isUpdatingRemoteCluster: PropTypes.bool,
    updateRemoteClusterError: PropTypes.node,
    clearUpdateRemoteClusterErrors: PropTypes.func,
    openDetailPanel: PropTypes.func,
  }

  constructor(props) {
    super(props);

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
    this.props.clearUpdateRemoteClusterErrors();
    this.props.stopEditingCluster();
  }

  save = (clusterConfig) => {
    this.props.updateRemoteCluster(clusterConfig);
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
      isUpdatingRemoteCluster,
      updateRemoteClusterError,
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
        isSaving={isUpdatingRemoteCluster}
        saveError={updateRemoteClusterError}
        save={this.save}
        cancel={this.cancel}
      />
    );
  }

  render() {
    const {
      clusterName,
    } = this.state;

    const breadcrumbs = [{
      text: (
        <FormattedMessage
          id="xpack.remoteClusters.edit.breadcrumbs.listText"
          defaultMessage="Remote clusters"
        />
      ),
      ...getRouterLinkProps(CRUD_APP_BASE_PATH),
    }, {
      text: (
        <FormattedMessage
          id="xpack.remoteClusters.edit.breadcrumbs.addText"
          defaultMessage="Edit"
        />
      ),
    }];

    return (
      <Fragment>
        <EuiPage>
          <EuiPageBody>
            <EuiPageContent
              horizontalPosition="center"
              className="remoteClusterAddPage"
            >
              <EuiBreadcrumbs breadcrumbs={breadcrumbs} responsive={false} />

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
