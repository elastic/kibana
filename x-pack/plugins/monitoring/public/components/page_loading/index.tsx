/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import './page_loading.scss';
import { useTrackPageview } from '@kbn/observability-plugin/public';

function PageLoadingUI() {
  return (
    <EuiPage style={{ height: 'calc(100vh - 50px)' }}>
      <EuiPageBody>
        <EuiPageContent
          verticalPosition="center"
          horizontalPosition="center"
          className="monNoData__content"
        >
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="xl" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.monitoring.pageLoadingTitle"
                    defaultMessage="Loading…"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

const PageLoadingTracking: React.FunctionComponent<{ pageViewTitle: string }> = ({
  pageViewTitle,
}) => {
  const path = pageViewTitle.toLowerCase().replace(/-/g, '').replace(/\s+/g, '_');
  useTrackPageview({ app: 'stack_monitoring', path });
  useTrackPageview({ app: 'stack_monitoring', path, delay: 15000 });
  return <PageLoadingUI />;
};

export const PageLoading: React.FunctionComponent<{ pageViewTitle?: string }> = ({
  pageViewTitle,
}) => {
  if (pageViewTitle) {
    return <PageLoadingTracking pageViewTitle={pageViewTitle} />;
  }

  return <PageLoadingUI />;
};
