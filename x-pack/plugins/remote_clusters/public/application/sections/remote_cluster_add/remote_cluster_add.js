/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageSection, EuiPageBody } from '@elastic/eui';

import { extractQueryParams } from '../../../shared_imports';
import { getRouter, redirect } from '../../services';
import { setBreadcrumbs } from '../../services/breadcrumb';
import { RemoteClusterPageTitle } from '../components';
import { RemoteClusterWizard } from './wizard_form';

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

  redirectToList = () => {
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
      <EuiPageBody data-test-subj="remote-clusters-add">
        <EuiPageSection paddingSize="none">
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
                defaultMessage="Create a connection from this cluster to other Elasticsearch clusters."
              />
            }
          />

          <RemoteClusterWizard
            saveRemoteClusterConfig={this.save}
            onCancel={this.redirectToList}
            isSaving={isAddingCluster}
            addClusterError={addClusterError}
          />
        </EuiPageSection>
      </EuiPageBody>
    );
  }
}
