/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCallOut, EuiButton } from '@elastic/eui';

import { PolicyResponseActionFormatter } from './policy_response_friendly_names';

export const PolicyResponseErrorCallout = memo(
  ({ policyResponseError }: { policyResponseError: PolicyResponseActionFormatter }) => {
    const policyResponseErrorCalloutLink = useMemo(() => {
      if (!policyResponseError.linkText || !policyResponseError.linkUrl) {
        return;
      }
      return (
        <EuiButton
          data-test-subj="endpointPolicyResponseErrorCallOutLink"
          color="danger"
          href={policyResponseError.linkUrl}
        >
          {policyResponseError.linkText}
        </EuiButton>
      );
    }, [policyResponseError]);

    return (
      <EuiCallOut
        data-test-subj="endpointPolicyResponseErrorCallOut"
        className="policyResponseErrorCallOut"
        title={policyResponseError.errorTitle}
        color="danger"
        iconType="alert"
      >
        <p style={{ marginBottom: '8px' }}>{policyResponseError.errorDescription}</p>
        {policyResponseErrorCalloutLink}
      </EuiCallOut>
    );
  }
);

PolicyResponseErrorCallout.displayName = 'PolicyResponseErrorCallout';
