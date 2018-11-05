/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { NoDataLayout } from '../components/layouts/no_data';

export const InvalidLicensePage: React.SFC<any> = () => (
  <NoDataLayout title="Invalid License" actionSection={[]}>
    <p>Your current license does not support Beats Central Management, or is expired.</p>
  </NoDataLayout>
);
