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
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { getRouterLinkProps } from '../../services';

import { RemoteClusterForm } from '../remote_cluster_form';


export class RemoteClusterAddUi extends Component {
  static propTypes = {
    addCluster: PropTypes.func,
    isAddingCluster: PropTypes.bool,
    addClusterError: PropTypes.object,
    clearAddClusterErrors: PropTypes.func,
  }

  componentWillUnmount() {
    // Clean up after ourselves.
    this.props.clearAddClusterErrors();
  }

  save = (clusterConfig) => {
    this.props.addCluster(clusterConfig);
  };

  render() {
    const { isAddingCluster, addClusterError } = this.props;

    const breadcrumbs = [{
      text: (
        <FormattedMessage
          id="xpack.remoteClusters.add.breadcrumbs.listText"
          defaultMessage="Remote clusters"
        />
      ),
      ...getRouterLinkProps(CRUD_APP_BASE_PATH),
    }, {
      text: (
        <FormattedMessage
          id="xpack.remoteClusters.add.breadcrumbs.addText"
          defaultMessage="Connect"
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
                      id="xpack.remoteClusters.addTitle"
                      defaultMessage="Connect remote cluster"
                    />
                  </h1>
                </EuiTitle>
              </EuiPageContentHeader>

              <RemoteClusterForm
                isSaving={isAddingCluster}
                saveError={addClusterError}
                save={this.save}
              />
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      </Fragment>
    );
  }
}

export const RemoteClusterAdd = injectI18n(RemoteClusterAddUi);
