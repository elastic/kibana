/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLoadingElastic,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent_Deprecated as EuiPageContent,
} from '@elastic/eui';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { Container, Wrapper } from './layouts';
import { OsqueryAppRoutes } from '../routes';
import { useOsqueryIntegrationStatus } from '../common/hooks';
import { OsqueryAppEmptyState } from './empty_state';
import { MainNavigation } from './main_navigation';

const OsqueryAppComponent = () => {
  const { customBranding } = useKibana().services;
  const { data: osqueryIntegration, isFetched } = useOsqueryIntegrationStatus();
  const hasCustomBranding = useObservable(customBranding?.hasCustomBranding$ || of(false), false);
  if (!isFetched) {
    return (
      <EuiPage paddingSize="none">
        <EuiPageBody>
          <EuiPageContent
            verticalPosition="center"
            horizontalPosition="center"
            paddingSize="none"
            color="subdued"
            hasShadow={false}
          >
            {hasCustomBranding ? (
              <EuiLoadingSpinner size="xxl" />
            ) : (
              <EuiLoadingElastic size="xxl" />
            )}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  if (isFetched && osqueryIntegration?.install_status !== 'installed') {
    return <OsqueryAppEmptyState />;
  }

  return (
    <Container id="osquery-app">
      <Wrapper>
        <MainNavigation />
        <OsqueryAppRoutes />
      </Wrapper>
    </Container>
  );
};

export const OsqueryApp = React.memo(OsqueryAppComponent);
