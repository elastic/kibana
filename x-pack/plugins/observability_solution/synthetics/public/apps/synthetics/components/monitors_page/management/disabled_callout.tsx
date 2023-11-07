/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import * as labels from './labels';
import { useEnablement } from '../../../hooks';

export const DisabledCallout = ({ total }: { total: number }) => {
  const { enablement, invalidApiKeyError, loading } = useEnablement();

  const showDisableCallout = !enablement.isEnabled && total > 0;
  const showInvalidApiKeyCallout = invalidApiKeyError && total > 0;

  if (!showDisableCallout && !showInvalidApiKeyCallout) {
    return null;
  }

  return !enablement.canEnable && !loading ? (
    <>
      <EuiCallOut title={labels.CALLOUT_MANAGEMENT_DISABLED} color="warning">
        <p>{labels.CALLOUT_MANAGEMENT_DESCRIPTION}</p>
        <p>
          {labels.CALLOUT_MANAGEMENT_CONTACT_ADMIN}{' '}
          <EuiLink
            data-test-subj="syntheticsMonitorManagementPageLink"
            href="https://www.elastic.co/guide/en/observability/current/synthetics-get-started-ui.html#uptime-set-up-prereq"
            target="_blank"
          >
            {labels.LEARN_MORE_LABEL}
          </EuiLink>
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;
};
