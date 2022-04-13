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

import { listBreadcrumb, addBreadcrumb, setBreadcrumbs } from '../../services/breadcrumbs';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
} from '../../components';
import { SectionLoading } from '../../../shared_imports';

export class AutoFollowPatternAdd extends PureComponent {
  static propTypes = {
    saveAutoFollowPattern: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
  };

  componentDidMount() {
    setBreadcrumbs([listBreadcrumb('/auto_follow_patterns'), addBreadcrumb]);
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  render() {
    const {
      saveAutoFollowPattern,
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
                    id="xpack.crossClusterReplication.autoFollowPatternCreateForm.loadingRemoteClustersMessage"
                    defaultMessage="Loading remote clusters…"
                  />
                </SectionLoading>
              </EuiPageContent>
            );
          }

          return (
            <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
              <AutoFollowPatternPageTitle
                title={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPattern.addTitle"
                    defaultMessage="Add auto-follow pattern"
                  />
                }
              />

              <AutoFollowPatternForm
                apiStatus={apiStatus}
                apiError={apiError}
                currentUrl={currentUrl}
                remoteClusters={error ? [] : remoteClusters}
                saveAutoFollowPattern={saveAutoFollowPattern}
                saveButtonLabel={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternCreateForm.saveButtonLabel"
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
