/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiPageContent,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { listBreadcrumb, addBreadcrumb, getRouter, redirect, extractQueryParams } from '../../services';
import { RemoteClusterPageTitle, RemoteClusterForm } from '../components';

export const RemoteClusterAdd = injectI18n(
  class extends Component {
    static propTypes = {
      addCluster: PropTypes.func,
      isAddingCluster: PropTypes.bool,
      addClusterError: PropTypes.object,
      clearAddClusterErrors: PropTypes.func,
    }

    constructor(props) {
      super(props);
      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, addBreadcrumb ]);
    }

    componentWillUnmount() {
      // Clean up after ourselves.
      this.props.clearAddClusterErrors();
    }

    save = (clusterConfig) => {
      this.props.addCluster(clusterConfig);
    };

    cancel = () => {
      const { history, route: { location: { search } } } = getRouter();
      const { redirect: redirectUrl } = extractQueryParams(search);

      if (redirectUrl) {
        const decodedRedirect = decodeURIComponent(redirectUrl);
        redirect(decodedRedirect);
      } else {
        history.push(CRUD_APP_BASE_PATH);
      }
    };

    render() {
      const { isAddingCluster, addClusterError } = this.props;

      return (
        <EuiPageContent
          horizontalPosition="center"
          className="remoteClusterAddPage"
        >
          <RemoteClusterPageTitle
            title={(
              <FormattedMessage
                id="xpack.remoteClusters.addTitle"
                defaultMessage="Add remote cluster"
              />
            )}
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
);
