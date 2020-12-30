/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { ApplicationStart } from 'kibana/public';
import { RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { PolicyTable as PresentationComponent } from './policy_table';
import { useKibana } from '../../../shared_imports';
import { useLoadPoliciesList } from '../../services/api';

interface Props {
  navigateToApp: ApplicationStart['navigateToApp'];
}

export const PolicyTable: React.FunctionComponent<Props & RouteComponentProps> = ({
  navigateToApp,
  history,
}) => {
  const {
    services: { breadcrumbService },
  } = useKibana();
  const { data: policies, isLoading, error, resendRequest } = useLoadPoliciesList(true);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policies');
  }, [breadcrumbService]);

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        title={<EuiLoadingSpinner size="xl" />}
        body={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyTable.policiesLoading"
            defaultMessage="Loading policies..."
          />
        }
      />
    );
  }
  if (error) {
    const { statusCode, message } = error ? error : { statusCode: '', message: '' };
    return (
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
    );
  }

  return (
    <PresentationComponent
      policies={policies || []}
      history={history}
      navigateToApp={navigateToApp}
      updatePolicies={resendRequest}
    />
  );
};
