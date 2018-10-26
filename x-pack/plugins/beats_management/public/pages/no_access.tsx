/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { NoDataLayout } from '../components/layouts/no_data';

export const NoAccessPage: React.SFC<any> = () => (
  <NoDataLayout title="Access Denied" actionSection={[]}>
    <p>
      You are not authorized to access Beats central management. To use Beats central management,
      you need the privileges granted by the `beats_admin` role.
    </p>
  </NoDataLayout>
);
