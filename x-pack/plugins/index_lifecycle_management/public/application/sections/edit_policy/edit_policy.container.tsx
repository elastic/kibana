/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useKibana } from '../../../shared_imports';

import { useLoadPoliciesList } from '../../services/api';
import { getPolicyByName } from '../../lib/policies';
import { defaultPolicy } from '../../constants';

import { EditPolicy as PresentationComponent } from './edit_policy';
import { EditPolicyContextProvider } from './edit_policy_context';

interface RouterProps {
  policyName: string;
}

interface Props {
  getUrlForApp: (
    appId: string,
    options?: {
      path?: string;
      absolute?: boolean;
    }
  ) => string;
}

export const EditPolicy: React.FunctionComponent<Props & RouteComponentProps<RouterProps>> = ({
  match: {
    params: { policyName },
  },
  getUrlForApp,
  history,
}) => {
  const {
    services: { breadcrumbService },
  } = useKibana();
  const { error, isLoading, data: policies, resendRequest } = useLoadPoliciesList(false);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('editPolicy');
  }, [breadcrumbService]);

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        title={<EuiLoadingSpinner size="xl" />}
        body={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.policiesLoading"
            defaultMessage="Loading policies..."
          />
        }
      />
    );
  }
  if (error || !policies) {
    const { statusCode, message } = error ? error : { statusCode: '', message: '' };
    return (
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
    );
  }

  const existingPolicy = getPolicyByName(policies, policyName);

  return (
    <EditPolicyContextProvider
      value={{
        isNewPolicy: !existingPolicy?.policy,
        policyName,
        policy: existingPolicy?.policy ?? defaultPolicy,
        existingPolicies: policies,
        getUrlForApp,
      }}
    >
      <PresentationComponent history={history} />
    </EditPolicyContextProvider>
  );
};
