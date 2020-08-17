/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiCallOut, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLoadPoliciesList } from '../../services/api';

import { EditPolicy as PresentationComponent } from './edit_policy';

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
  const { error, isLoading, data: policies, sendRequest } = useLoadPoliciesList(false);
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
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.lifecyclePoliciesLoadingFailedTitle"
            defaultMessage="Unable to load existing lifecycle policies"
          />
        }
        color="danger"
      >
        <p>
          {message} ({statusCode})
        </p>
        <EuiButton onClick={sendRequest} iconType="refresh" color="danger">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.lifecyclePoliciesReloadButton"
            defaultMessage="Try again"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <PresentationComponent
      policies={policies}
      history={history}
      getUrlForApp={getUrlForApp}
      policyName={policyName}
    />
  );
};
