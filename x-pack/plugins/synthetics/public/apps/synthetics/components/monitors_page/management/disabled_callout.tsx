/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import { InvalidApiKeyCalloutCallout } from './invalid_api_key_callout';
import * as labels from './labels';
import { useEnablement } from '../../../hooks';

export const DisabledCallout = ({ total }: { total: number }) => {
  const { enablement, enableSynthetics, invalidApiKeyError, loading } = useEnablement();

  const showDisableCallout = !enablement.isEnabled && total > 0;
  const showInvalidApiKeyError = invalidApiKeyError && total > 0;

  if (showInvalidApiKeyError) {
    return <InvalidApiKeyCalloutCallout />;
  }

  if (!showDisableCallout) {
    return null;
  }

  return (
    <EuiCallOut title={labels.CALLOUT_MANAGEMENT_DISABLED} color="warning" iconType="help">
      <p>{labels.CALLOUT_MANAGEMENT_DESCRIPTION}</p>
      {enablement.canEnable || loading ? (
        <EuiButton
          data-test-subj="syntheticsMonitorManagementPageButton"
          fill
          color="primary"
          onClick={() => {
            enableSynthetics();
          }}
          isLoading={loading}
        >
          {labels.SYNTHETICS_ENABLE_LABEL}
        </EuiButton>
      ) : (
        <p>
          {labels.CALLOUT_MANAGEMENT_CONTACT_ADMIN}{' '}
          <EuiLink data-test-subj="syntheticsMonitorManagementPageLink" href="#" target="_blank">
            {labels.LEARN_MORE_LABEL}
          </EuiLink>
        </p>
      )}
    </EuiCallOut>
  );
};
