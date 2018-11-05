/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { NoDataLayout } from '../components/layouts/no_data';

export const EnforceSecurityPage: React.SFC<any> = () => (
  <NoDataLayout title="Security Disabled" actionSection={[]}>
    <p>
      Security is not currently enabled on your stack. Enableing security is required for the use of
      Beats Central Management
    </p>
  </NoDataLayout>
);
