/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPageContent } from '@elastic/eui';

import { extractQueryParams } from '../../../shared_imports';
import { getRouter, redirect } from '../../services';
import { setBreadcrumbs } from '../../services/breadcrumb';
import { RemoteClusterPageTitle, RemoteClusterForm } from '../components';

export class RemoteClusterAdd extends PureComponent {
  static propTypes = {
    addCluster: PropTypes.func,
    isAddingCluster: PropTypes.bool,
    addClusterError: PropTypes.object,
    clearAddClusterErrors: PropTypes.func,
  };

  componentDidMount() {
    setBreadcrumbs('add');
  }

  componentWillUnmount() {
    // Clean up after ourselves.
    this.props.clearAddClusterErrors();
  }

  save = (clusterConfig) => {
    this.props.addCluster(clusterConfig);
  };

  cancel = () => {
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
    }
  };

  render() {
    const { isAddingCluster, addClusterError } = this.props;

    return (
      <EuiPageContent
        horizontalPosition="center"
        className="remoteClusterAddPage"
        data-test-subj="remoteClusterAddPage"
      >
        <RemoteClusterPageTitle
          title={
            <FormattedMessage
              id="xpack.remoteClusters.addTitle"
              defaultMessage="Add remote cluster"
            />
          }
          description={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClustersDescription"
              defaultMessage="Add a remote cluster that connects to seed nodes or a single proxy address."
            />
          }
        />

        <RemoteClusterForm
          isSaving={isAddingCluster}
          saveError={addClusterError}
          save={this.save}
          cancel={this.cancel}
        />
      </EuiPageContent>
    );
  }
}
