/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageContentBody, EuiPageContent } from '@elastic/eui';

import { setBreadcrumbs, listBreadcrumb, addBreadcrumb } from '../../services/breadcrumbs';
import {
  FollowerIndexForm,
  FollowerIndexPageTitle,
  RemoteClustersProvider,
} from '../../components';
import { SectionLoading } from '../../../shared_imports';

export class FollowerIndexAdd extends PureComponent {
  static propTypes = {
    saveFollowerIndex: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
  };

  componentDidMount() {
    setBreadcrumbs([listBreadcrumb('/follower_indices'), addBreadcrumb]);
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  render() {
    const {
      saveFollowerIndex,
      clearApiError,
      apiStatus,
      apiError,
      match: { url: currentUrl },
    } = this.props;

    return (
      <RemoteClustersProvider>
        {({ isLoading, error, remoteClusters }) => {
          if (isLoading) {
            return (
              <EuiPageContent
                verticalPosition="center"
                horizontalPosition="center"
                color="subdued"
                data-test-subj="remoteClustersLoading"
              >
                <SectionLoading>
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexCreateForm.loadingRemoteClustersMessage"
                    defaultMessage="Loading remote clusters…"
                  />
                </SectionLoading>
              </EuiPageContent>
            );
          }

          return (
            <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
              <FollowerIndexPageTitle
                title={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndex.addTitle"
                    defaultMessage="Add follower index"
                  />
                }
              />
              <FollowerIndexForm
                apiStatus={apiStatus}
                apiError={apiError}
                currentUrl={currentUrl}
                remoteClusters={error ? [] : remoteClusters}
                saveFollowerIndex={saveFollowerIndex}
                clearApiError={clearApiError}
                saveButtonLabel={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexCreateForm.saveButtonLabel"
                    defaultMessage="Create"
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
