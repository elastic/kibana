/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiPageContent,
} from '@elastic/eui';

import { listBreadcrumb, addBreadcrumb } from '../../services/breadcrumbs';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
  SectionLoading,
} from '../../components';

export const AutoFollowPatternAdd = injectI18n(
  class extends PureComponent {
    static propTypes = {
      saveAutoFollowPattern: PropTypes.func.isRequired,
      clearApiError: PropTypes.func.isRequired,
      apiError: PropTypes.object,
      apiStatus: PropTypes.string.isRequired,
    }

    componentDidMount() {
      chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, addBreadcrumb ]);
    }

    componentWillUnmount() {
      this.props.clearApiError();
    }

    render() {
      const { saveAutoFollowPattern, apiStatus, apiError, match: { url: currentUrl } } = this.props;

      return (
        <EuiPageContent>
          <AutoFollowPatternPageTitle
            title={(
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPattern.addTitle"
                defaultMessage="Add auto-follow pattern"
              />
            )}
          />

          <RemoteClustersProvider>
            {({ isLoading, error, remoteClusters }) => {
              if (isLoading) {
                return (
                  <SectionLoading>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternCreateForm.loadingRemoteClusters"
                      defaultMessage="Loading remote clusters..."
                    />
                  </SectionLoading>
                );
              }

              return (
                <AutoFollowPatternForm
                  apiStatus={apiStatus}
                  apiError={apiError}
                  currentUrl={currentUrl}
                  remoteClusters={error ? [] : remoteClusters}
                  saveAutoFollowPattern={saveAutoFollowPattern}
                  saveButtonLabel={(
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternCreateForm.saveButtonLabel"
                      defaultMessage="Create"
                    />
                  )}
                />
              );
            }}
          </RemoteClustersProvider>
        </EuiPageContent>
      );
    }
  }
);
