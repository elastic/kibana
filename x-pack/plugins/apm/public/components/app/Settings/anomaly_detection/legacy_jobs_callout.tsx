/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiButton } from '@elastic/eui';
import React from 'react';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';

export function LegacyJobsCallout() {
  const { core } = useApmPluginContext();
  return (
    <EuiCallOut
      title="Legacy ML jobs are no longer used in APM app"
      iconType="iInCircle"
    >
      <p>
        We have discovered legacy Machine Learning jobs from our previous
        integration which are no longer being used in the APM app
      </p>
      <EuiButton
        href={core.http.basePath.prepend(
          '/app/ml#/jobs?mlManagement=(jobId:high_mean_response_time)'
        )}
      >
        Review jobs
      </EuiButton>
    </EuiCallOut>
  );
}
