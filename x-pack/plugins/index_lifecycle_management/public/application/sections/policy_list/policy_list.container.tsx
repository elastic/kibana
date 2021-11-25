/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PolicyList as PresentationComponent } from './policy_list';
import { useKibana } from '../../../shared_imports';
import { useLoadPoliciesList } from '../../services/api';
import { PolicyListContextProvider } from './policy_list_context';

export const PolicyList: React.FunctionComponent = () => {
  const {
    services: { breadcrumbService },
  } = useKibana();
  const { data: policies, isLoading, error, resendRequest } = useLoadPoliciesList();

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policies');
  }, [breadcrumbService]);

  if (isLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <EuiEmptyPrompt
          title={<EuiLoadingSpinner size="xl" />}
          body={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.policiesLoading"
              defaultMessage="Loading policies..."
            />
          }
        />
      </EuiPageContent>
    );
  }
  if (error) {
    const { statusCode, message } = error ? error : { statusCode: '', message: '' };
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.policiesLoadingFailedTitle"
                defaultMessage="Unable to load existing lifecycle policies"
              />
            </h2>
          }
          body={
            <p>
              {message} ({statusCode})
            </p>
          }
          actions={
            <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.policiesReloadButton"
                defaultMessage="Try again"
              />
            </EuiButton>
          }
        />
      </EuiPageContent>
    );
  }

  return (
    <PolicyListContextProvider>
      <PresentationComponent policies={policies || []} updatePolicies={resendRequest} />
    </PolicyListContextProvider>
  );
};
