/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { MIN_SEARCHABLE_SNAPSHOT_LICENSE } from '../../../../common/constants';
import { useKibana, attemptToURIDecode } from '../../../shared_imports';

import { useLoadPoliciesList } from '../../services/api';
import { getPolicyByName } from '../../lib/policies';
import { defaultPolicy } from '../../constants';

import { EditPolicy as PresentationComponent } from './edit_policy';
import { EditPolicyContextProvider } from './edit_policy_context';

interface RouterProps {
  policyName: string;
}

export const EditPolicy: React.FunctionComponent<RouteComponentProps<RouterProps>> = ({
  match: {
    params: { policyName },
  },
}) => {
  const {
    services: { breadcrumbService, license },
  } = useKibana();
  const { error, isLoading, data: policies, resendRequest } = useLoadPoliciesList();

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('editPolicy');
  }, [breadcrumbService]);

  if (isLoading) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <EuiEmptyPrompt
          title={<EuiLoadingSpinner size="xl" />}
          body={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.policiesLoading"
              defaultMessage="Loading policies..."
            />
          }
        />
      </EuiPageContent>
    );
  }
  if (error || !policies) {
    const { statusCode, message } = error ? error : { statusCode: '', message: '' };
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.lifecyclePoliciesLoadingFailedTitle"
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
                id="xpack.indexLifecycleMgmt.editPolicy.lifecyclePoliciesReloadButton"
                defaultMessage="Try again"
              />
            </EuiButton>
          }
        />
      </EuiPageContent>
    );
  }

  const existingPolicy = getPolicyByName(policies, attemptToURIDecode(policyName));

  return (
    <EditPolicyContextProvider
      value={{
        isNewPolicy: !existingPolicy?.policy,
        policyName: attemptToURIDecode(policyName),
        policy: existingPolicy?.policy ?? defaultPolicy,
        existingPolicies: policies,
        license: {
          canUseSearchableSnapshot: () => license.hasAtLeast(MIN_SEARCHABLE_SNAPSHOT_LICENSE),
        },
        indices: existingPolicy && existingPolicy.indices ? existingPolicy.indices : [],
        indexTemplates:
          existingPolicy && existingPolicy.indexTemplates ? existingPolicy.indexTemplates : [],
      }}
    >
      <PresentationComponent />
    </EditPolicyContextProvider>
  );
};
