/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { NoDataLayout } from '../components/layouts/no_data';

export const EnforceSecurityPage: React.SFC<any> = () => (
  <NoDataLayout title="Security is not enabled" actionSection={[]}>
    <p>You must enable security in Kibana and Elasticsearch to use Beats central management.</p>
  </NoDataLayout>
);
