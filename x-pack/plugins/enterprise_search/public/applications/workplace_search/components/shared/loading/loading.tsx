/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';

import './loading.scss';

export const Loading: React.FC = () => (
  <div className="loadingSpinnerWrapper">
    <EuiLoadingSpinner size="xl" className="loadingSpinner" />
  </div>
);
