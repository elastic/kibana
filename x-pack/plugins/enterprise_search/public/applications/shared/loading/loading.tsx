/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import './loading.scss';

export const Loading: React.FC = () => (
  <div className="enterpriseSearchLoading">
    <EuiLoadingSpinner size="xl" />
  </div>
);
